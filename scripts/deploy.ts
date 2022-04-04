import { ethers } from "hardhat";

async function main() {
  //Get the contract to deploy
  const ETHPool = await ethers.getContractFactory("ETHPool");

  const [deployer, team] = await ethers.getSigners();
  const ethpool = await ETHPool.deploy(process.env.TEAM_ADDRESS || "");

  await ethpool.deployed();

  console.log("ETHPool deployed at:", ethpool.address);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
