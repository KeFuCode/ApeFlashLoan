const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require('hardhat');

const vaultFactoryAddr = '0xBE86f647b167567525cCAAfcd6f881F1Ee558216';

const deployHash = '0x8ccd49bd56b7d5b47c4f0e4ac2a7a1194c50168b0fa1ff82eb5f28fb7fe60f45'

async function main() {
    const Hunter = await ethers.getContractFactory("Hunter");
    const hunter = await Hunter.deploy(vaultFactoryAddr);
    await hunter.deployed();

    console.log("Hunter deployed to:", hunter.address)
}

main().then(
    () => process.exit(0).catch(
        (error) => { 
            console.log(error);
            process.exit(1);
        }
));