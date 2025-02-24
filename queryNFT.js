import { createPublicClient, http} from 'viem';
import { mainnet } from 'viem/chains';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(`https://mainnet.infura.io/v3/41e91e22268d4ef1bae736ac12d48e1f`),
  //transport: http(),
});
// BAYC 合约地址和 ABI（简化版，仅包含 ownerOf 函数）
const baycAddress = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'; 
const baycAbi = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name:"tokenURI",
    inputs:[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    outputs:[{"internalType":"string","name":"","type":"string"}],
    stateMutability:"view",
    type:"function"},
]

// 查询函数
async function getNFTOwner(tokenId) {
  try {
    const data = await publicClient.readContract({
        address: baycAddress,
        abi: baycAbi,
        functionName: 'ownerOf',
        args:[tokenId]
      })
     console.log('ownerOf: ', tokenId, data) 

     const metaData = await publicClient.readContract({
      address: baycAddress,
      abi: baycAbi,
      functionName: 'tokenURI',
      args:[tokenId]
    })
   console.log('tokenURI: ', tokenId, metaData)      
  } catch (error) {
    console.error('查询失败:', error);
  }
}


// 从命令行获取 tokenId
const tokenIdArg = process.argv[2]; // 获取第一个参数
if (!tokenIdArg) {
  console.error('请提供 tokenId 参数，例如：node queryNFT.js 1');
  process.exit(1);
}

// 将参数转换为 bigint 类型
const tokenId = BigInt(tokenIdArg);

// 调用函数
getNFTOwner(tokenId);