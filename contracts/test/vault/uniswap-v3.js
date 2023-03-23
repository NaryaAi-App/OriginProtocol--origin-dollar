const { expect } = require("chai");
const {
  uniswapV3FixtureSetup,
  impersonateAndFundContract,
  defaultFixtureSetup,
} = require("../_fixture");
const {
  units,
  ousdUnits,
  expectApproxSupply,
  usdcUnits,
  usdtUnits,
} = require("../helpers");
const { deployments } = require("hardhat");
const { BigNumber } = require("ethers");

describe("Vault x Uniswap V3 Strategy", () => {
  after(async () => {
    // This is needed to revert fixtures
    // The other tests as of now don't use proper fixtures
    // Rel: https://github.com/OriginProtocol/origin-dollar/issues/1259
    const f = defaultFixtureSetup();
    await f();
  });

  // Fixtures
  const uniswapV3Fixture = uniswapV3FixtureSetup();

  const depositFixture = deployments.createFixture(async () => {
    const fixture = await uniswapV3Fixture();

    // Add some funds to the Uniswap and reserve strategies
    for (const asset of [usdt, usdc]) {
      for (const contract of [
        fixture.UniV3_USDC_USDT_Strategy,
        fixture.mockStrategy,
      ]) {
        const account = await impersonateAndFundContract(contract);
        await asset.connect(account).mint(await units("10000000", asset));
      }
    }

    return fixture;
  });

  let vault, ousd, usdc, usdt, dai;
  let reserveStrategy,
    strategy,
    helper,
    mockPool,
    mockPositionManager,
    mockStrategy2,
    mockStrategyDAI;
  let governor, strategist, operator, josh, matt, daniel, domen, franck;

  function _destructureFixture(_fixture) {
    // fixture = _fixture;
    reserveStrategy = _fixture.mockStrategy;
    mockStrategy2 = _fixture.mockStrategy2;
    mockStrategyDAI = _fixture.mockStrategyDAI;
    strategy = _fixture.UniV3_USDC_USDT_Strategy;
    helper = _fixture.UniV3Helper;
    mockPool = _fixture.UniV3_USDC_USDT_Pool;
    mockPositionManager = _fixture.UniV3PositionManager;
    // swapRotuer = _fixture.UniV3SwapRouter;
    ousd = _fixture.ousd;
    usdc = _fixture.usdc;
    usdt = _fixture.usdt;
    dai = _fixture.dai;
    vault = _fixture.vault;
    governor = _fixture.governor;
    strategist = _fixture.strategist;
    operator = _fixture.operator;
    josh = _fixture.josh;
    matt = _fixture.matt;
    daniel = _fixture.daniel;
    domen = _fixture.domen;
    franck = _fixture.franck;
  }

  describe("Strategy Management", () => {
    beforeEach(async () => {
      _destructureFixture(await uniswapV3Fixture());
    });

    it("Should allow Governor to add Uniswap V3 Strategy", async () => {
      // Pretend OUSD is a strategy and add its address
      await vault.connect(governor).approveUniswapV3Strategy(ousd.address);
    });

    it("Should revert approving strategy if caller is not governor", async () => {
      for (const user of [strategist, operator, franck]) {
        await expect(
          vault.connect(user).approveUniswapV3Strategy(ousd.address)
        ).to.be.revertedWith("Caller is not the Governor");
      }
    });
  });

  describe("Deposit to Reserve", () => {
    beforeEach(async () => {
      _destructureFixture(await depositFixture());
    });

    it("Should allow to deposit to strategy's reserve", async () => {
      const reserveBalanceBefore = await usdc.balanceOf(
        reserveStrategy.address
      );
      const uniswapBalanceBefore = await usdc.balanceOf(strategy.address);

      const amount = usdcUnits("10000");

      const impersonatedStrategy = await impersonateAndFundContract(strategy);
      await vault
        .connect(impersonatedStrategy)
        .depositToUniswapV3Reserve(usdc.address, amount);

      await expect(reserveStrategy).to.have.approxBalanceOf(
        reserveBalanceBefore.add(amount),
        usdc,
        "Amount not depositted to reserve"
      );

      await expect(strategy).to.have.approxBalanceOf(
        uniswapBalanceBefore.sub(amount),
        usdc,
        "Amount not removed from Uniswap Strategy"
      );
    });

    it("Should revert deposit if it's not Uniswap V3 Strategy", async () => {
      const impersonatedStrategy = await impersonateAndFundContract(
        reserveStrategy
      );
      await expect(
        vault
          .connect(impersonatedStrategy)
          .depositToUniswapV3Reserve(usdc.address, usdcUnits("10000"))
      ).to.be.revertedWith("Caller is not Uniswap V3 Strategy");
    });

    it("Should revert deposit if it's not a supported reserve", async () => {
      // Remove ReserveStrategy from Vault
      await vault.connect(governor).removeStrategy(reserveStrategy.address);

      const impersonatedStrategy = await impersonateAndFundContract(strategy);

      await expect(
        vault
          .connect(impersonatedStrategy)
          .depositToUniswapV3Reserve(usdc.address, usdcUnits("10000"))
      ).to.be.revertedWith("Unknown reserve strategy");
    });
  });

  describe("Withdraw from Reserve", () => {
    beforeEach(async () => {
      _destructureFixture(await depositFixture());
    });

    it("Should allow to withdraw from strategy's reserve", async () => {
      const reserveBalanceBefore = await usdc.balanceOf(
        reserveStrategy.address
      );
      const uniswapBalanceBefore = await usdc.balanceOf(strategy.address);

      const amount = usdcUnits("10000");

      const impersonatedStrategy = await impersonateAndFundContract(strategy);
      await vault
        .connect(impersonatedStrategy)
        .withdrawFromUniswapV3Reserve(usdc.address, usdcUnits("10000"));

      await expect(reserveStrategy).to.have.approxBalanceOf(
        reserveBalanceBefore.sub(amount),
        usdc,
        "Amount not taken from Reserve strategy"
      );

      await expect(strategy).to.have.approxBalanceOf(
        uniswapBalanceBefore.add(amount),
        usdc,
        "Amount not depositted to Uniswap Strategy"
      );
    });

    it("Should revert withdraw if it's not Uniswap V3 Strategy", async () => {
      const impersonatedStrategy = await impersonateAndFundContract(
        reserveStrategy
      );
      await expect(
        vault
          .connect(impersonatedStrategy)
          .withdrawFromUniswapV3Reserve(usdc.address, usdcUnits("10000"))
      ).to.be.revertedWith("Caller is not Uniswap V3 Strategy");
    });

    it("Should revert withdraw if it's not a supported reserve", async () => {
      // Remove ReserveStrategy from Vault
      await vault.connect(governor).removeStrategy(reserveStrategy.address);

      const impersonatedStrategy = await impersonateAndFundContract(strategy);

      await expect(
        vault
          .connect(impersonatedStrategy)
          .withdrawFromUniswapV3Reserve(usdc.address, usdcUnits("10000"))
      ).to.be.revertedWith("Unknown reserve strategy");
    });

    it("Should revert withdraw if asset is not supported by reserve", async () => {
      await reserveStrategy.connect(governor).removeAsset(usdc.address);

      const impersonatedStrategy = await impersonateAndFundContract(strategy);

      await expect(
        vault
          .connect(impersonatedStrategy)
          .withdrawFromUniswapV3Reserve(usdc.address, usdcUnits("10000"))
      ).to.be.revertedWith("Unsupported asset");
    });
  });
});
