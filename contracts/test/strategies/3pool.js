const { expect } = require("chai");
const { utils } = require("ethers");
const { MAX_UINT256 } = require("../../utils/constants");

const { threepoolVaultFixture } = require("../_fixture");
const {
  daiUnits,
  usdtUnits,
  ousdUnits,
  units,
  loadFixture,
  expectApproxSupply,
  isFork,
} = require("../helpers");

describe("3Pool Strategy", function () {
  if (isFork) {
    this.timeout(0);
  }

  let anna,
    ousd,
    vault,
    harvester,
    governor,
    crv,
    crvMinter,
    threePoolToken,
    threePoolGauge,
    threePoolStrategy,
    usdt,
    usdc,
    dai;

  const mint = async (amount, asset) => {
    await asset.connect(anna).mint(await units(amount, asset));
    await asset
      .connect(anna)
      .approve(vault.address, await units(amount, asset));
    return await vault
      .connect(anna)
      .mint(asset.address, await units(amount, asset), 0);
  };

  beforeEach(async function () {
    const fixture = await loadFixture(threepoolVaultFixture);
    anna = fixture.anna;
    vault = fixture.vault;
    harvester = fixture.harvester;
    ousd = fixture.ousd;
    governor = fixture.governor;
    crv = fixture.crv;
    crvMinter = fixture.crvMinter;
    threePoolToken = fixture.threePoolToken;
    threePoolGauge = fixture.threePoolGauge;
    threePoolStrategy = fixture.threePoolStrategy;
    usdt = fixture.usdt;
    usdc = fixture.usdc;
    dai = fixture.dai;

    await vault
      .connect(governor)
      .setAssetDefaultStrategy(usdc.address, threePoolStrategy.address);
    await vault
      .connect(governor)
      .setAssetDefaultStrategy(usdt.address, threePoolStrategy.address);
  });

  describe("Mint", function () {
    it("Should stake USDT in Curve gauge via 3pool", async function () {
      await expectApproxSupply(ousd, ousdUnits("200"));
      await mint("30000.00", usdt);
      await expectApproxSupply(ousd, ousdUnits("30200"));
      await expect(anna).to.have.a.balanceOf("30000", ousd);
      await expect(threePoolGauge).has.an.approxBalanceOf(
        "30000",
        threePoolToken
      );
    });

    it("Should stake USDC in Curve gauge via 3pool", async function () {
      await expectApproxSupply(ousd, ousdUnits("200"));
      await mint("50000.00", usdc);
      await expectApproxSupply(ousd, ousdUnits("50200"));
      await expect(anna).to.have.a.balanceOf("50000", ousd);
      await expect(threePoolGauge).has.an.approxBalanceOf(
        "50000",
        threePoolToken
      );
    });

    it("Should use a minimum LP token amount when depositing USDT into 3pool", async function () {
      await expect(mint("29000", usdt)).to.be.revertedWith(
        "Slippage ruined your day"
      );
    });

    it("Should use a minimum LP token amount when depositing USDC into 3pool", async function () {
      await expect(mint("29000", usdc)).to.be.revertedWith(
        "Slippage ruined your day"
      );
    });
  });

  describe("Redeem", function () {
    it("Should be able to unstake from gauge and return USDT", async function () {
      await expectApproxSupply(ousd, ousdUnits("200"));
      await mint("10000.00", dai);
      await mint("10000.00", usdc);
      await mint("10000.00", usdt);
      await vault.connect(anna).redeem(ousdUnits("20000"), 0);
      await expectApproxSupply(ousd, ousdUnits("10200"));
    });
  });

  describe("Utilities", function () {
    it("Should allow transfer of arbitrary token by Governor", async () => {
      await dai.connect(anna).approve(vault.address, daiUnits("8.0"));
      await vault.connect(anna).mint(dai.address, daiUnits("8.0"), 0);
      // Anna sends her OUSD directly to Strategy
      await ousd
        .connect(anna)
        .transfer(threePoolStrategy.address, ousdUnits("8.0"));
      // Anna asks Governor for help
      await threePoolStrategy
        .connect(governor)
        .transferToken(ousd.address, ousdUnits("8.0"));
      await expect(governor).has.a.balanceOf("8.0", ousd);
    });

    it("Should not allow transfer of arbitrary token by non-Governor", async () => {
      // Naughty Anna
      await expect(
        threePoolStrategy
          .connect(anna)
          .transferToken(ousd.address, ousdUnits("8.0"))
      ).to.be.revertedWith("Caller is not the Governor");
    });

    it("Should allow the governor to call harvest for a specific strategy", async () => {
      // Mint of MockCRVMinter mints a fixed 2e18
      // prettier-ignore
      await harvester
        .connect(governor)["harvest(address)"](threePoolStrategy.address);
    });

    it("Should collect reward tokens using collect rewards on all strategies", async () => {
      // Mint of MockCRVMinter mints a fixed 2e18
      await crvMinter.connect(governor).mint(threePoolStrategy.address);
      await harvester.connect(governor)["harvest()"]();
      await expect(await crv.balanceOf(harvester.address)).to.be.equal(
        utils.parseUnits("2", 18)
      );
    });

    it("Should collect reward tokens using collect rewards on a specific strategy", async () => {
      // Mint of MockCRVMinter mints a fixed 2e18
      await crvMinter.connect(governor).mint(threePoolStrategy.address);
      await harvester.connect(governor)[
        // eslint-disable-next-line
        "harvest(address)"
      ](threePoolStrategy.address);
      await expect(await crv.balanceOf(harvester.address)).to.be.equal(
        utils.parseUnits("2", 18)
      );
      await crvMinter.connect(governor).mint(threePoolStrategy.address);
      await expect(await crv.balanceOf(harvester.address)).to.be.equal(
        utils.parseUnits("2", 18)
      );
    });

    it("Should collect reward tokens and swap via Uniswap", async () => {
      const mockUniswapRouter = await ethers.getContract("MockUniswapRouter");

      await mockUniswapRouter.initialize([crv.address], [usdt.address]);
      await harvester.connect(governor).setRewardTokenConfig(
        crv.address, // reward token
        300, // max slippage bps
        100, // harvest reward bps
        mockUniswapRouter.address,
        MAX_UINT256,
        true
      );

      // Make sure Vault has 0 USDT balance
      await expect(vault).has.a.balanceOf("0", usdt);

      // Make sure the Strategy has CRV balance
      await crvMinter.connect(governor).mint(threePoolStrategy.address);
      await expect(
        await crv.balanceOf(await governor.getAddress())
      ).to.be.equal("0");
      await expect(await crv.balanceOf(threePoolStrategy.address)).to.be.equal(
        utils.parseUnits("2", 18)
      );
      // Give Uniswap mock some USDT so it can give it back in CRV liquidation
      await usdt
        .connect(anna)
        .transfer(mockUniswapRouter.address, usdtUnits("100"));
      const balanceBeforeAnna = await usdt.balanceOf(anna.address);
      // prettier-ignore
      await harvester
        .connect(anna)["harvestAndSwap(address)"](threePoolStrategy.address);

      const balanceAfterAnna = await usdt.balanceOf(anna.address);

      // Make sure Vault has 100 USDT balance (the Uniswap mock converts at 1:1)
      await expect(vault).has.a.balanceOf("1.98", usdt);
      await expect(balanceAfterAnna - balanceBeforeAnna).to.be.equal(
        utils.parseUnits("0.02", 6)
      );

      // No CRV in Vault or Compound strategy
      await expect(harvester).has.a.balanceOf("0", crv);
      await expect(await crv.balanceOf(threePoolStrategy.address)).to.be.equal(
        "0"
      );
    });
  });
});
