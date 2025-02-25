#!/usr/bin/env node

import { createPublicClient, createWalletClient, http, parseEther, parseGwei, encodeFunctionData} from 'viem';
import { sepolia } from 'viem/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { program } from 'commander';



// my ERC20 CA
const erc20CAOnLocalDev = '0x5fbdb2315678afecb367f032d93f642f64180aa3'
const erc20CAOnSepolia = '0x7CC71121FB38265fC9e34a144565A147C580a014'
// 
const defaultRecipientAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const defaultERC20Amount = 123456789n

// my sepolia test account w/ erc20 for both Sepolia and Anvil
// 0x602542Ff05Bf0876a58aB1f2C4f9342721c7E1a6



// 替换为你的 RPC 节点 URL
const mySepoliaRPC = 'https://eth-mainnet.g.alchemy.com/v2/NcfXeBgIZhl8v52rEh0N4UKR64435r_g';
const victorSepoliaRPC = 'https://eth-sepolia.g.alchemy.com/v2/2ouiAr7Yc42ZgIR6VjfupOpeR3rAPZXB';
const myLocalDevRPC = 'http://127.0.0.1:8545';
// 替换为目标链
//const chain = anvilChain;
const chain = sepolia;
const rpcUrl = victorSepoliaRPC;
//const rpcUrl = myLocalDevRPC;
const anvilChain = {
    id: 31337,
    name: 'Anvil',
    network: 'anvil',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [myLocalDevRPC] },
    },
};
const erc20Abi = [ 
  {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "transfer",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },    
]


const publicClient = createPublicClient({
  chain: chain,
  transport: http(rpcUrl),

})


//walletCli new
function generateNewWallet() {
  const GeneratedPrivateKey = generatePrivateKey();
  const account = privateKeyToAccount(GeneratedPrivateKey);
    
  return { address: account.address, privateKey: GeneratedPrivateKey };
}

// wallet balance
const getEthBalance = async function (desiredAddr){
    const balance = await publicClient.getBalance({
        address: desiredAddr,
    })
    return balance;
} 


// wallet token_balance
const getTokenBalance = async function (tokenCA, address) {
    try {
      const balance = await publicClient.readContract({
        address: tokenCA,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      console.log(`Token balance: ${balance}`);
      return balance;
    } catch (error) {
      console.error("Get token balance failure: ", error);
    }
}

const transferERC20EIP1559 = async function (tokenCA, recipientAddress, amount, privateKey) {


  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: chain,
    transport: http(rpcUrl),

  })

  try {
    // 动态获取费用参数
    const block = await publicClient.getBlock({ blockTag: 'latest' });
    const baseFeePerGas = block.baseFeePerGas * 150n/100n || 10n * 10n**9n; // 默认值以防未获取到
    const feeData = await publicClient.estimateFeesPerGas();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 150n/100n || 2n * 10n**9n; // 默认 2 gwei
    const buffer = 2n * 10n**9n; // 缓冲区
    const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas + buffer;

    console.log('Base Fee Per Gas:', baseFeePerGas.toString());
    console.log('Max Priority Fee Per Gas:', maxPriorityFeePerGas.toString());
    console.log('Max Fee Per Gas:', maxFeePerGas.toString());

    // 构建交易数据
    const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipientAddress, amount],
    });

    // 估算 gas
    const gasEstimated = await publicClient.estimateContractGas({
    address: tokenCA,
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipientAddress, amount],
    account: walletClient.account.address,
    });
    console.log('gas estimated: ' + gasEstimated);
    
    console.log('chain: ' + chain );

    // 构建 EIP-1559 交易
    const transaction = {
    to: tokenCA,
    data,
    gas: gasEstimated,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type: "eip1559",
    };

    // 5. 签名并发送交易
    const txHash = await walletClient.sendTransaction(transaction);
    console.log("交易哈希:", txHash);

    // 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    });
    console.log(`Sent\tfrom:\t${walletClient.account.address} \n\tto:\t${recipientAddress}\n \t\tvia contract: ${tokenCA}, amount: ${amount}`);
    console.log('Transaction confirmed blockNumber: '+ receipt.blockNumber)
    return receipt.transactionHash;
  } catch (error) {
    console.error('Transfer failed:', error)
  }
}





// 设置命令行工具的基本信息
program
  .name('wallet')
  .description('A CLI tool for wallet operations on Ethereum')
  .version('1.0.0');

// 子命令 1: wallet new
program
  .command('new')
  .description('Generate a new wallet')
  .action(() => {
    console.log('Generating a new wallet...');
    const newWallet = generateNewWallet(); 
    console.log('New wallet address:', newWallet.address);
    console.log('Private key:', newWallet.privateKey);
  });

// 子命令 2: wallet balance <ownerAddress>
program
  .command('balance')
  .description('Check ETH balance of an address')
  .argument('<ownerAddress>', 'Wallet address to check balance')
  .action(async (ownerAddress) => {
    console.log(`Checking ETH balance for address: ${ownerAddress}`);
    const balance = await getEthBalance(ownerAddress); // 假设的函数
    console.log(`Balance: ${balance} ETH`);
  });

// 子命令 3: wallet token_balance <tokenContractAddress> <ownerAddress>
program
  .command('token_balance')
  .description('Check token balance of an address for a specific ERC-20 token')
  .argument('<tokenContractAddress>', 'ERC-20 token contract address')
  .argument('<ownerAddress>', 'Wallet address to check token balance')
  .action(async (tokenContractAddress, ownerAddress) => {
    console.log(`Checking token balance for address: ${ownerAddress}`);
    console.log(`Token contract: ${tokenContractAddress}`);
    // 这里可以添加查询代币余额的逻辑
    const tokenBalance = await getTokenBalance(tokenContractAddress, ownerAddress); // 假设的函数
    console.log(`Token balance: ${tokenBalance}`);
  });

// 子命令 4: wallet transfer <tokenContractAddress> <toAddress>
program
  .command('transfer')
  .description('Transfer ERC-20 tokens to another address')
  .argument('<tokenContractAddress>', 'ERC-20 token contract address')
  .argument('<toAddress>', 'Recipient address')
  .option('-a, --amount <amount>', 'Amount of tokens to transfer', '123456789')
  .option('-p, --private-key <key>', 'Private key of the sender', '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')  
  .action(async (tokenContractAddress, toAddress, options) => {
    console.log(`Transferring tokens...`);
    console.log(`Token contract: ${tokenContractAddress}`);
    console.log(`To address: ${toAddress}`);
    console.log(`Amount: ${options.amount}`);
    const txHash = await transferERC20EIP1559(tokenContractAddress, toAddress, options.amount, options.privateKey);
    console.log(`Transaction hash: ${txHash}`);
  });

// 解析命令行参数
program.parse(process.argv);


// 如果没有提供子命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}