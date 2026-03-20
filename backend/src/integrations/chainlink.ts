import { ethers } from 'ethers';

// Chainlink ETH/USD Price Feed on Sepolia
const SEPOLIA_ETH_USD_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
const SEPOLIA_RPC = 'https://rpc.sepolia.org';

// Chainlink AggregatorV3Interface — only latestRoundData()
const AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

const MOCK_ETH_PRICE = 3000.0;
const PRICE_DEVIATION_THRESHOLD = 0.05; // 5%

/**
 * Get the current ETH/USD price from Chainlink on Sepolia.
 * Falls back to a mock price if the RPC is unavailable.
 */
export async function getEthPrice(): Promise<{ price: number; source: string; roundId: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const feed = new ethers.Contract(SEPOLIA_ETH_USD_FEED, AGGREGATOR_ABI, provider);

    const [roundId, answer] = await feed.latestRoundData();

    // Chainlink ETH/USD feed uses 8 decimals
    const price = Number(answer) / 1e8;

    if (price <= 0) {
      throw new Error('Invalid price from Chainlink feed');
    }

    console.log(`[Chainlink] ETH/USD price: $${price.toFixed(2)} (round ${roundId.toString()})`);
    return {
      price,
      source: 'chainlink_sepolia',
      roundId: roundId.toString(),
    };
  } catch (err: any) {
    console.warn(`[Chainlink] Sepolia feed unavailable, using mock price: $${MOCK_ETH_PRICE}. Error: ${err.message}`);
    return {
      price: MOCK_ETH_PRICE,
      source: 'mock_fallback',
      roundId: '0',
    };
  }
}

/**
 * Verify that a transaction's implied price is fair (within 5% of Chainlink price).
 * @param valueEth - The ETH amount in the transaction
 * @param expectedUsd - The expected USD value the user thinks they are getting
 */
export async function verifyFairPrice(
  valueEth: number,
  expectedUsd: number
): Promise<{ fair: boolean; deviation: number; chainlink_price: number; source: string }> {
  const { price: chainlinkPrice, source } = await getEthPrice();

  const impliedPrice = expectedUsd / valueEth;
  const deviation = Math.abs(impliedPrice - chainlinkPrice) / chainlinkPrice;

  const fair = deviation <= PRICE_DEVIATION_THRESHOLD;

  if (!fair) {
    console.warn(
      `[Chainlink] Price deviation alert: implied $${impliedPrice.toFixed(2)} vs Chainlink $${chainlinkPrice.toFixed(2)} (${(deviation * 100).toFixed(1)}% deviation)`
    );
  }

  return {
    fair,
    deviation: Math.round(deviation * 10000) / 100, // percentage with 2 decimals
    chainlink_price: chainlinkPrice,
    source,
  };
}
