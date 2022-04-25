const { ethers } = require('hardhat');
const hre = require('hardhat');

const erc20_abi = require('').abi;
const vault_abi = require('').abi; 
const router_abi = []; 

const vBAYCAddr = '';
const baycVaultAddr = '';
const sushiRouterV2Addr = '';
const weth_addr = '';
const ape_addr = '';
const vaultFactoryAddr = '0xBE86f647b167567525cCAAfcd6f881F1Ee558216';
const baycAddr = '';
const airDropAddr = '';

const account = '';

async function main() {
    let BORROW_AMOUNT = 1;

    const [deployer] = await hre.ethers.getSigners();
    const provider = hre.ethers.provider;

    const vBAYC = new ethers.Contract(vBAYCAddr, erc20_abi, provider);
    console.log(`vBAYC balance:${await vBAYC.balanceOf(deployer.address)}`);

    const vault = new ethers.Contract(vBAYCAddr, vault_abi, provider);
    console.log(`all holdings ${await vault.allHoldings()}`);

    const feePerToken = await vault.randomRedeemFee();
    const mintFeePerToken = await vault.mintFee();
    console.log(`redeemFee ${mintFeePerToken}`);
    console.log(`mintFee ${feePerToken}`);
    const totalFee = (feePerToken.add(mintFeePerToken)).mul(BORROW_AMOUNT);
    console.log(`require total fee ${totalFee}`);

    const router = new ethers.Contract(sushiRouterV2Addr, router_abi, provider);

    let [amountIn, _] = await router.getAmountsIn(totalFee, [weth_addr, vBAYCAddr]);

    console.log(`require ether ${ethers.utils.formatEther(amountIn)}`);
    const now = (await provider.getBlock()).timestamp;
    let tx = await router.connect(deployer).swapETHForExactTokens(
        totalFee,
        [weth_addr, vBAYCAddr],
        deployer.address,
        now + timestamp, // ???
        { value:amountIn } // ???
    );
    await tx.wait();
    console.log(`vBAYC balance:${await vBAYC.balanceOf(deployer.address)}`);
    
    await vBAYC.connect(deployer).transfer(hunter.address, totalFee);

    const hunterFactory = await hre.ethers.getContractFactory('Hunter');
    const hunter = await hunterFactory.deploy(vaultFactoryAddr);
    await hunter.deployed();

    const ape = new ethers.Contract(ape_addr, erc20_abi, provider);

    console.log(`hunter $ape balance ${await ape.balanceOf(hunter.address)}`);

    const airdrop = new ethers.Contract(airDropAddr, airdrop_abi, provider);

    console.log(`hunter vBayc balance ${await vBAYC.balanceOf(hunter.address)}`);

    let tx2 = await hunter.connect(deployer).initFlashLoan({
        nft: baycAddr,
        amount: BORROW_AMOUNT,
        claim: airDropAddr,
        ids: []
    });
    await tx2.wait();

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