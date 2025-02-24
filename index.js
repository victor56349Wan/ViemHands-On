import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});
async function main() {
    const blockNumber = await client.getBlockNumber();

    console.log(blockNumber);
        
}
main().catch(console.error)
