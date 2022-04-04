import { Provider } from "@ethersproject/abstract-provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("ETHPool", function () {
  let accounts: any[];
  let team: SignerWithAddress;
  let newTeam: SignerWithAddress;
  let ethpool: Contract;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    const ETHPool = await ethers.getContractFactory("ETHPool");
    team = accounts[1]; 
    newTeam = accounts[2];
    ethpool = await ETHPool.deploy(await team.getAddress()); 
    await ethpool.deployed();
  })


  describe("Delpoy", function() {
    
    it ("Deployment should assign team", async function() {
      expect(await ethpool.team()).equal(await team.getAddress());
    });

  });

  describe("Direct send on the contract address", function() {
    
    it ("Direct send should be reverted exept team", async function() {
        await expect(newTeam.sendTransaction({to: ethpool.address, value: parseEther("0.7")})).to.be.revertedWith("Only Team can call this method");
    }); 

    it ("Direct send by Team should emit MinRewardForNextTimeWasAdded", async function()  {
      await expect(team.sendTransaction({to: ethpool.address, value: parseEther("0.8")})).to.emit(ethpool, "MinRewardForNextTimeWasAdded").withArgs(parseEther("0.8"));
    });

  });

  describe("Direct send with data on the contract address", function() {

    it ("Direct send should be reverted exept team", async function() {
        await expect(newTeam.sendTransaction({to: ethpool.address, value: parseEther("0.9"), data: ("0x12a132")})).to.be.revertedWith("Only Team can call this method");
    }); 

    it ("Direct send by Team should emit MinRewardForNextTimeWasAdded", async function()  {
      await expect(team.sendTransaction({to: ethpool.address, value: parseEther("1"), data: ("0x12f3aa")})).to.emit(ethpool, "MinRewardForNextTimeWasAdded").withArgs(parseEther("1"));
    });

  });


  describe("changeTeam method", function() {

    it ("Shouldn't allow to initialize teamChange anybody except team", async function() {
      await expect(ethpool.changeTeam(await newTeam.getAddress())).to.be.revertedWith("Only Team can call this method");
    });

    it("Should emit InitializeTeamChange and change newTeam variable", async function () {
      await expect(ethpool.connect(team).changeTeam(newTeam.getAddress())).to.emit(ethpool, "InitializeTeamChange").withArgs(await team.getAddress(), await newTeam.getAddress());
      expect(await ethpool.newTeam()).to.equal(await newTeam.getAddress());
    });

  });

  describe("admitNewTeam method", function() {
  
    it ("Shouldn't allow to admit teamChange anybody except newTeam", async function() {
      await ethpool.connect(team).changeTeam(newTeam.getAddress());
      expect(ethpool.admitNewTeam()).to.be.revertedWith("Only newTeam allows");
      expect(ethpool.connect(accounts[3]).admitNewTeam()).to.be.revertedWith("Only newTeam allows");
    });

    it ("Should emit TeamChanged and change team variable", async function() {
      await ethpool.connect(team).changeTeam(newTeam.getAddress());
      await expect(ethpool.connect(newTeam).admitNewTeam()).to.emit(ethpool, "TeamChanged").withArgs(await newTeam.getAddress());
      expect(await ethpool.team()).equal(await newTeam.getAddress());
    })

  });

  describe("makeDeposit method", function() {

    it ("Shouldn't allow to accept less then 10 gwei", async function() {
        await expect(ethpool.connect(accounts[4]).makeDeposit({value: 9e9})).to.be.revertedWith("Min deposit is 10 gwei"); 
    });

    it ("Should increase usersCount for new user", async function() { 
      const currentUsersCount = await ethpool.usersCount();
      await ethpool.connect(accounts[4]).makeDeposit({value: parseEther("0.1")});
      expect(await ethpool.usersCount()).equal(currentUsersCount + 1);
    });  

    it ("Shouldn't increase usersCount who deposited and have not withdrawn yet", async function() {
      await ethpool.connect(accounts[4]).makeDeposit({value: parseEther("0.2")});
      const currentUsersCount = await ethpool.usersCount();
      await ethpool.connect(accounts[4]).makeDeposit({value: parseEther("0.3")});
      expect(await ethpool.usersCount()).equal(currentUsersCount);
    });

    it ("Should set correct sharesCount for new user and emit Deposit", async function() {
      const sharesCount = parseEther("0.4").div(await ethpool.sharePrice());
      await expect(ethpool.connect(accounts[4]).makeDeposit({value: parseEther("0.4")})).to.emit(ethpool, "Deposit").withArgs(await accounts[4].getAddress(), parseEther("0.4"), sharesCount);
      expect(await ethpool.sharesOwnedByUsers(await accounts[4].getAddress())).equal(sharesCount);
    });

    it ("Should set correct sharesCount for old user and emit Deposit", async function() {
      const sharesCount = parseEther("0.5").div(await ethpool.sharePrice()).add(parseEther("0.6").div(await ethpool.sharePrice()));
      expect(ethpool.connect(accounts[4]).makeDeposit({ value: parseEther("0.5")}));
      await expect(ethpool.connect(accounts[4]).makeDeposit({value: parseEther("0.6")})).to.emit(ethpool, "Deposit").withArgs(await accounts[4].getAddress(), parseEther("0.6"), sharesCount);
      expect(await ethpool.sharesOwnedByUsers(await accounts[4].getAddress())).equal(sharesCount);
    });

  });

  describe("teamMakesReward method", function() {

    it ("Shouldn't allow to call teamChange anybody except team", async function() {
      await expect(ethpool.connect(accounts[3]).teamMakesReward({value: parseEther("0.7")})).to.be.revertedWith("Only Team can call this method");
    });

    it ("Shouldn't allow to accept less then 10 gwei", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("0.5")});
      await expect(ethpool.connect(team).teamMakesReward({value: 9e9})).to.be.revertedWith("Min rewards is 10 gwei"); 
    });

    it ("Shouldn't allow to call if there no any user with deposit", async function() {
      await expect(ethpool.connect(team).teamMakesReward({value: parseEther("0.4")})).to.be.revertedWith("No users to catch reward!"); 
    });

    it ("Should set correct sharePrice and emit RewardAdded", async function () {
      const oldSharePrice = await ethpool.sharePrice();
      const newSharePrice = oldSharePrice.add(parseEther("0.1").mul(oldSharePrice).div(parseEther("0.5")));
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("0.3")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("0.2")});
      await expect(ethpool.connect(team).teamMakesReward({value: parseEther("0.1")})).to.emit(ethpool, "RewardAdded").withArgs(parseEther("0.1"), newSharePrice);
      expect(await ethpool.sharePrice()).equal(newSharePrice);
    });

    it ("Should set correct sharePrice if some ether was sent without ETHPool method", async function(){
      const sharePrice = await ethpool.sharePrice();
      await team.sendTransaction({to: ethpool.address, value: parseEther("1")});
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("0.9")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("0.8")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("0.6")});
      expect(await ethpool.sharePrice()).equal(sharePrice.add(parseEther("1.6").mul(sharePrice).div(parseEther("1.7"))));
    });

  });

  describe("withdrawDepositAndRewards method", function() {

    it ("Shouldn't receive any ether if not deposited", async function() {
      expect(await ethpool.connect(accounts[3]).withdrawDepositAndRewards()).to.changeEtherBalance(accounts[3], 0);
    });

    it ("Should dec totalShares", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("0.3")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("0.2")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("0.1")});
      const oldTotalShares = await ethpool.totalShares();
      const oldAccount3SharesCount = await ethpool.sharesOwnedByUsers(await accounts[3].getAddress());
      await ethpool.connect(accounts[3]).withdrawDepositAndRewards();
      expect(await ethpool.totalShares()).equal(oldTotalShares - oldAccount3SharesCount);
    });

    it ("Should zeroing sharesOwnedByUsers for calling user", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("0.1")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("0.2")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("0.3")});
      await ethpool.connect(accounts[3]).withdrawDepositAndRewards();
      expect(await ethpool.sharesOwnedByUsers(await accounts[3].getAddress())).equal(0);
    });

    it ("Should dec userCount", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("0.4")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("0.5")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("0.6")});
      await ethpool.connect(accounts[3]).withdrawDepositAndRewards();
      expect(await ethpool.usersCount()).equal(1);
    });

    it ("Should set default sharePrice and emit PoolEmpty for last user", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("1.9")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("4.2")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("8.9")});
      await ethpool.connect(accounts[3]).withdrawDepositAndRewards();
      expect(await ethpool.connect(accounts[4]).withdrawDepositAndRewards()).to.emit(ethpool, "PoolEmpty").withArgs(1e10);
      expect(await ethpool.sharePrice()).equal(1e10);
    });

    it ("Should get deposit and rewards and emit WithdrawSuccesful", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("1.3")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("1.5")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("8.7")});
      const account4ShouldReceive = parseEther("1.5").add(parseEther("1.5").mul(parseEther("8.7").div(parseEther("2.8"))));
      expect(await ethpool.connect(accounts[4]).withdrawDepositAndRewards()).to.emit(ethpool, "WithdrawSuccessful").withArgs(await accounts[4].getAddress(), account4ShouldReceive)
        .to.changeEtherBalance(accounts[4], account4ShouldReceive);
    });

    it ("Should failed because send failed and emit UnsuccessfulWithdraw", async function() {
      const HelperForTest = await ethers.getContractFactory("HelperForTest");
      const helperForTest = await HelperForTest.deploy(await ethpool.resolvedAddress); 
      await helperForTest.deployed();
      await helperForTest.makeDeposit({value: parseEther("2.4")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("5.1")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("3.5")});
      await expect(helperForTest.withdrawDepositAndRewards()).to.be.revertedWith("UnsuccessfulWithdraw");
    });

    it ("Shouldn't allow to withdraw more if case of reentrancy", async function() {
      const HelperForTest = await ethers.getContractFactory("HelperForTestReentrancy");
      const helperForTest = await HelperForTest.deploy(await ethpool.resolvedAddress); 
      await helperForTest.deployed();
      await helperForTest.makeDeposit({value: parseEther("2.8")});
      await ethpool.connect(accounts[4]).makeDeposit({value:  parseEther("4.2")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("1.7")});
      
      await helperForTest.withdrawDepositAndRewards();
      const { waffle } = require("hardhat");
      const provider = waffle.provider;
      expect(await provider.getBalance(helperForTest.resolvedAddress) as BigNumber).lte(parseEther("2.8").add(parseEther("2.8").mul(parseEther("1.7")).div(parseEther("7"))));       
    });
 
  });

  describe("destroy method", function() {

    it ("Shouldn't destory if not team calling", async function() {
        await expect(ethpool.connect(accounts[3]).destroy()).to.be.revertedWith("Only Team can call this method");
    });

    it ("Should destroy and increase team balance", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("2.1")});
      expect(await ethpool.connect(team).destroy()).to.changeEtherBalance(team, parseEther("2.1"));
    });
 
  });

  describe("some general use cases", function() {
 
    it("Example from task", async function () {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("100")});
      await ethpool.connect(accounts[4]).makeDeposit({value: parseEther("300")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("200")});
      expect(await ethpool.connect(accounts[3]).withdrawDepositAndRewards()).to.changeEtherBalance(accounts[3], parseEther("150"));
      expect(await ethpool.connect(accounts[4]).withdrawDepositAndRewards()).to.changeEtherBalance(accounts[4], parseEther("420"));
    });

    it("Example from task considering the time", async function() {
      await ethpool.connect(accounts[3]).makeDeposit({value: parseEther("100")});
      await ethpool.connect(team).teamMakesReward({value: parseEther("200")});
      await ethpool.connect(accounts[4]).makeDeposit({value: parseEther("300")});
      expect(await ethpool.connect(accounts[3]).withdrawDepositAndRewards()).to.changeEtherBalance(accounts[3], parseEther("300"));
      expect(await ethpool.connect(accounts[4]).withdrawDepositAndRewards()).to.changeEtherBalance(accounts[4], parseEther("300")); 
    });

    it("General case with long time", async function() {
      let invested: BigNumber[] = new Array(20).fill(BigNumber.from(0));
      for (let i = 1; i < 34; ++i) {
        for (let j = 3; j < 20; ++j) {
          if (Math.random() > 0.69) {
            let toInvest = parseEther("0.01").mul(i * j); 
            invested[j] = invested[j].add(toInvest);
            await ethpool.connect(accounts[j]).makeDeposit({value: toInvest});
          }
        }
        if(Math.random() > 0.77) {
          let teamReward = parseEther("0.1").mul(i)
          await ethpool.connect(team).teamMakesReward({value: teamReward});
          let totalInvested = BigNumber.from(0);
          for (let j = 3; j < 20; ++j) {
            totalInvested = totalInvested.add(invested[j]);
          }
          for (let j = 3; j < 20; ++j) {
            invested[j] = invested[j].add(invested[j].mul(teamReward).div(totalInvested))
          }
        }
        
        for (let j = 3; j < 20; ++j) {
          if (Math.random() > 0.6) {
            expect(await ethpool.connect(accounts[j]).withdrawDepositAndRewards()).to.changeEtherBalance(accounts[j], invested[j]);
            invested[j] = BigNumber.from(0);
          }
        }
      }
    });
    
  });
})
