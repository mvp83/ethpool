import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { BigNumber, ethers } from "ethers";


dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat:{},
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      timeout: 120000,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY || ""]
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;

require("@nomiclabs/hardhat-ethers");

const ETHPool_ROPSTEN_ADDDRESS = "0x672b4c5c4bc858625400c3f953017fe5abb9ae46";
task("balance", "check balance of ethPool")
  .setAction(async (TaskArgs, hre) => {
    console.log("Balance is: %s", await hre.ethers.provider.getBalance(ETHPool_ROPSTEN_ADDDRESS));
});

task("balance_with_methods", "check balance which were deposited with methods")
  .setAction(async (TaskArgs, hre) => {
    const ETHPool = await hre.ethers.getContractFactory("ETHPool");
    const ethPool = ETHPool.attach(ETHPool_ROPSTEN_ADDDRESS);
    console.log("Balance is: %s", (await ethPool.sharePrice()).mul(await ethPool.totalShares()));
});
