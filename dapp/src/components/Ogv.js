import React, { useEffect } from 'react'
import { Typography } from '@originprotocol/origin-storybook'
import { assetRootPath } from 'utils/image'
import { useStoreState } from 'pullstate'
import useCirculatingSupplyQuery from '../queries/useCirculatingSupplyQuery'
import usePriceQuery from '../queries/usePriceQuery'
import useTotalSupplyQuery from '../queries/useTotalSupplyQuery'
import ContractStore from 'stores/ContractStore'
import { formatCurrency } from 'utils/math'

const Ogv = () => {
  const price = useStoreState(ContractStore, (s) => {
    return s.ogv.price || 0
  })

  const circulatingSupply = useStoreState(ContractStore, (s) => {
    return s.ogv.circulatingSupply || 0
  })

  const totalSupply = useStoreState(ContractStore, (s) => {
    return s.ogv.total || 0
  })

  const priceQuery = usePriceQuery({
    onSuccess: (price) => {
      ContractStore.update((s) => {
        s.ogv.price = price['origin-dollar-governance'].usd
      })
    },
  })

  const circulatingSupplyQuery = useCirculatingSupplyQuery({
    onSuccess: (circulatingSupply) => {
      ContractStore.update((s) => {
        s.ogv.circulatingSupply = circulatingSupply
      })
    },
  })

  const totalSupplyQuery = useTotalSupplyQuery({
    onSuccess: (totalSupply) => {
      ContractStore.update((s) => {
        s.ogv.total = totalSupply
      })
    },
  })

  useEffect(() => {
    priceQuery.refetch()
    circulatingSupplyQuery.refetch()
    totalSupplyQuery.refetch()
  }, [price, circulatingSupply, totalSupply])

  return (
    <section className="home gradient5 relative z-0">
      <div className="relative divide-black divide-y-2">
        <div>
          <div className="flex flex-col md:flex-row overflow-hidden max-w-screen-xl mx-auto md:pt-10 px-8 pb-20 text-center md:text-left">
            <div>
              <Typography.H3 className="md:text-left font-weight-bold">
                Governed by OGV stakers
              </Typography.H3>
              <br className="block" />
              <Typography.Caption className="md:text-left opacity-100">
                OUSD's future is shaped by voters who lock their OGV and
                participate in decentralized governance.
              </Typography.Caption>
              <img
                src={assetRootPath(`/images/ogv.png`)}
                className="mt-10 px-10 block md:hidden"
              />
              <div className=" flex flex-col justify-between w-full md:w-4/5 h-48 mb-20 text-left font-weight-bold mt-10 md:mt-24 h-36 md:h-52">
                <div className="flex flex-row justify-between">
                  <div className="w-96">
                    <Typography.Body2 className="text-xs md:text-base mb-2 font-weight-bold">
                      {'OGV PRICE'}
                    </Typography.Body2>
                    <Typography.H5>{`$${formatCurrency(
                      price,
                      4
                    )}`}</Typography.H5>
                  </div>
                  <div className="w-96">
                    <Typography.Body2 className="text-xs md:text-base mb-2 font-weight-bold">
                      {'OGV MARKET CAP'}
                    </Typography.Body2>
                    <Typography.H5>{`$${formatCurrency(
                      circulatingSupply * price,
                      0
                    )}`}</Typography.H5>
                  </div>
                </div>
                <div className="flex flex-row justify-between">
                  <div className="w-96">
                    <Typography.Body2 className="text-xs md:text-base mb-2 font-weight-bold">
                      {'CIRCULATING SUPPLY'}
                    </Typography.Body2>
                    <Typography.H5>
                      {formatCurrency(circulatingSupply, 0)}
                    </Typography.H5>
                  </div>
                  <div className="w-96">
                    <Typography.Body2 className="text-xs md:text-base mb-2 font-weight-bold">
                      {'TOTAL SUPPLY'}
                    </Typography.Body2>
                    <Typography.H5>
                      {formatCurrency(totalSupply, 0)}
                    </Typography.H5>
                  </div>
                </div>
              </div>
              <span className="hidden md:block w-1/5">
                <a
                  href='https://"app.uniswap.org/#/swap?outputCurrency=0x9c354503C38481a7A7a51629142963F98eCC12D0&chain=mainnet"'
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bttn bg-black"
                >
                  Buy OGV
                </a>
              </span>
              {/*<a
                href='/ogv'
                target="_blank"
                rel="noopener noreferrer"
                className="bttn gradient3"
              >
                View dashboard
              </a>*/}
            </div>
            <div>
              <img
                src={assetRootPath(`/images/ogv.png`)}
                className="hidden md:block"
              />
              <Typography.Body2 className="my-4 opacity-75 text-center">
                OGV is listed on top exchanges
              </Typography.Body2>
              <div className="flex flex-row justify-between">
                <img src={assetRootPath(`/images/huobi.svg`)} />
                <img src={assetRootPath(`/images/uniswap.svg`)} />
                <img src={assetRootPath(`/images/kucoin.svg`)} />
              </div>
              <a
                href='https://"app.uniswap.org/#/swap?outputCurrency=0x9c354503C38481a7A7a51629142963F98eCC12D0&chain=mainnet"'
                target="_blank"
                rel="noopener noreferrer"
                className="bttn bg-black block md:hidden text-center mt-5"
              >
                Buy OGV
              </a>
            </div>
          </div>
        </div>
        <div>
          <div className="overflow-hidden max-w-screen-xl mx-auto mt-16 md:pt-10 px-8 pb-10 md:pb-20 text-center">
            <div>
              <Typography.H3>
                Stake OGV <br className="block" />
                <span className="gradient1 font-bold py-1">To Earn OGV</span>
              </Typography.H3>
              <br className="block" />
              <Typography.Body2 className="mb-10 font-light">
                Fees and voting rights accrue to OGV stakers. Control the future
                of OUSD <br className="hidden md:block" />
                and profit from its growth.
              </Typography.Body2>
              <a
                href="https://governance.ousd.com/stake"
                target="_blank"
                rel="noopener noreferrer"
                className="bttn bg-black"
              >
                Earn rewards
              </a>
            </div>
          </div>
        </div>
      </div>
      <img
        src={assetRootPath(`/images/splines21.png`)}
        className="absolute w-3/5 left-0 bottom-0 -z-10"
      />
    </section>
  )
}

export default Ogv
