import { createPublicClient, http, parseAbiItem, formatUnits, erc20Abi } from 'viem'
import { mainnet } from 'viem/chains'

// 从环境变量获取 RPC URL
const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
    throw new Error('RPC_URL environment variable is not set');
} 
const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL)
})

// 默认参数
const DEFAULT_ERC20_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
const DEFAULT_BLOCK_COUNT = 100;

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
async function getERC20Transfers(contractAddress, blockCount) {
    const symbol = await publicClient.readContract({
        address: contractAddress, 
        abi: erc20Abi,
        functionName: 'symbol',
      })
    const decimals = await publicClient.readContract({
        address: contractAddress, 
        abi: erc20Abi,
        functionName: 'decimals',
      })
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock - BigInt(blockCount);
    const filter = await publicClient.createEventFilter({ 
        address: contractAddress,
        event: TRANSFER_EVENT,
        fromBlock: fromBlock,
        toBlock: latestBlock
    });
    const logs = await publicClient.getFilterLogs({ filter });
    logs.forEach((log, index) => {
        console.log(`Transfer: ${index+1}`);
        const value = formatUnits(log.args.value, decimals);
        console.log(`从 ${log.args.from} 转账给 ${log.args.to} ${value} ${symbol}, 交易ID: ${log.transactionHash}`);
    });
    console.log(`===== Total ${logs.length} transfers of ${symbol} found in latest ${blockCount} blocks(from ${fromBlock} to ${latestBlock})`);
}
// 从命令行参数获取输入
const args = process.argv.slice(2);
const contractAddress = args[0] || DEFAULT_ERC20_ADDRESS;
const blockCount = args[1] ? parseInt(args[1], 10) : DEFAULT_BLOCK_COUNT;


getERC20Transfers(contractAddress, blockCount).catch(console.error);