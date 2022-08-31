
//使用说明，在终端执行 npx hardhat test ./test/veToken-verity-test.js
//个人权益测式角本
 
const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;

const { utils} = require("ethers");

const DELAY_WEEK = 604800; // 1 week 

const gas ={
    gasPrice:1097302934,
    gasLimit:20000000
  }
  
async function moveTime(amount) {
  console.log("Moving blocks increaseTime...")
  await hre.network.provider.send("evm_increaseTime",[amount])
  console.log(`Moved forward in time ${amount} seconds`)
}

async function moveBlock(amount) {
    console.log("Moving blocks...",amount)
    for (let index = 0; index < amount; index++) {
        await hre.network.provider.request({
          method: "evm_mine",
          params: [],
        })
    }
    console.log(`Moved ${amount} blocks`)
}

async function blockInfo(){
    console.log("区块号：",await provider.getBlockNumber());
    console.log("区块时间：",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}

function toBN(num){
  return ethers.BigNumber.from(num);
}

async function getUser(index){
  const accounts = await hre.ethers.getSigners();
  const user = accounts[index];
  console.log(user.address);
  return user;
}

describe("测式VeToken合约", async ()=> {
    let veToken;
    let token;
    let deployerAddress;

    before(async () => {
        const VeToken = await hre.ethers.getContractFactory("VeToken");
        const veTokenContract = await VeToken.deploy();
        await veTokenContract.deployed();
        console.log("veTokenContract deployed to:", veTokenContract.address);
      
        const vote = await hre.ethers.getContractFactory("Vote");
        const voteContract = await  vote.deploy();
        await voteContract.deployed();
        console.log("VoteContract deployed to:", voteContract.address);
      
        const auction = await hre.ethers.getContractFactory("Auction");
        const auctionContract = await  auction.deploy();
        await auctionContract.deployed();
        console.log("auctionContract deployed to:", auctionContract.address);
        
        const vault = await hre.ethers.getContractFactory("Vault");
        const vaultContract = await  vault.deploy();
        await vaultContract.deployed();
        console.log("vaultContract deployed to:", vaultContract.address);
      
        const Settings = await hre.ethers.getContractFactory("Settings");
        const SettingsContract = await Settings.deploy();
        await SettingsContract.deployed();
        console.log("veTokenContract deployed to:", SettingsContract.address);
      
        const Factory = await hre.ethers.getContractFactory("Factory"); 
        const factoryContract = await  Factory.deploy(SettingsContract.address);
        await factoryContract.deployed();
        console.log("factoryContract deployed to:", factoryContract.address);
      
        const division = await hre.ethers.getContractFactory("Division"); 
        const divisionContract = await  division.deploy();
        await divisionContract.deployed();
        console.log("divisionContract deployed to:", divisionContract.address);
      
        const router = await hre.ethers.getContractFactory("Router"); 
        const routerContract = await router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await routerContract.deployed();
        console.log("routerContract deployed to:", routerContract.address);
      
        await factoryContract.setLogic(routerContract.address,true,gas);
       
        let test =await factoryContract.mint(routerContract.address,"test",gas);
        await test.wait(1);
      
        const newRouterAddress = await factoryContract.routers(0)
        const newRouterContracy = await router.attach(newRouterAddress)
        console.log("newRouterAddress : ",newRouterAddress)
        
        //--------------------------------Vault------------------------------------
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        const TestERC1155Contract = await  TestERC11555.deploy();
      
        await TestERC1155Contract.deployed();
       
        const mint1 = await TestERC1155Contract.mint("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",1,10,gas)
        await mint1.wait(1);
      
        const mint2 = await TestERC1155Contract.mint("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",2,10,gas)
        await mint2.wait(1);
        
        const mint3 = await TestERC1155Contract.mint("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",3,10,gas)
        await mint3.wait(1);
      
        let newVaultAddress =  await newRouterContracy.vault();
        console.log("newVaultAddress : ",newVaultAddress);
         const setApprovalForAll= await TestERC1155Contract.setApprovalForAll(newVaultAddress,true,gas);
        console.log("【aprove】");
        await setApprovalForAll.wait(1);
      
        const deposit = await newRouterContracy.curatorDeposit(
          [TestERC1155Contract.address,TestERC1155Contract.address,TestERC1155Contract.address],
          [1,2,3],
          [10,10,10]
          ,gas);
        console.log("【curatorDeposit】");
        await deposit.wait(1);
      
 
        const tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1000",18),6048000,6048000,gas)
        console.log("【issue】");
        await tx.wait(1);
 
        // ----------------------------------------------------------

        const [deployer] = await ethers.getSigners();
        deployerAddress = deployer.address;

        //生成 token合约 (Division)
        const newDivisionAddress = await newRouterContracy.division();
        token = await divisionContract.attach(newDivisionAddress);
        console.log("tokenAddress = ",token.address);
        
        let balanceOfMe = await token.balanceOf(deployerAddress)
        console.log(String(balanceOfMe))

 
        //生成 vetoken 合约 
 
        const newVeTokenAddress = await newRouterContracy.veToken();
        veToken = await veTokenContract.attach(newVeTokenAddress);
        console.log("vetokenAddress = ",veToken.address);
        // console.log(veToken);
 
 
        
    })

    afterEach(()=>{

    })
    
 
    xit("->校验用户质押<4周时应该报错",async ()=>{
        const amount = 100000000000000000000;
        //token授权给veToken
        let approveTx = await token.approve(veToken.address,amount+"");
        let approveResult =  await approveTx.wait();
        console.log("授权成功！");
        let mybalance = await token.balanceOf(deployerAddress)
        console.log(mybalance)

        //质押
        let TotalR = await veToken.totalReward();
        console.log(TotalR)
        let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
        await blockInfo();
        console.log("质押锁定时间：",unLockedTime);
        console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
        let tx = await veToken.createLock(amount+"",unLockedTime);
        let tx2 = await tx.wait();

    });
    xit("->测式两个用户质押10周，A第1周质押,B用户第3周质押，都是质押10周，最大奖励时长10周，当前时间分别在某个时间点的总的奖励数与未领取数量验证",async ()=>{
        const amount = ethers.utils.parseUnits("100");
        console.log("amount = ",amount);

        //token授权给veToken
        let approveTx = await token.approve(veToken.address,amount+"");
        let approveResult =  await approveTx.wait();
        console.log("授权成功！");
        let mybalance = await token.balanceOf(deployerAddress)
        console.log(mybalance)

        //默认用户质押10周
        console.log("总的奖励数：",await veToken.totalReward());
        let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
        console.log("质押锁定时间：",unLockedTime);
        console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
        let tx = await veToken.createLock(amount,unLockedTime);
        let tx2 = await tx.wait();

        await moveTime(DELAY_WEEK * 2);
        await moveBlock(1);
        // await blockInfo();
        
        //用户2质押
        let user2 = await getUser(1);
        console.log("user2=",user2.address);

        await (await token.transfer(user2.address,amount)).wait();
        console.log("用户2的token余额=",await token.balanceOf(user2.address));

        await (await token.connect(user2).approve(veToken.address,amount)).wait();

        unLockedTime = await blockInfo() + DELAY_WEEK * 10;
        let veToken2 = veToken.connect(user2);
        await veToken2.createLock(amount,unLockedTime,gas);

        await moveTime(DELAY_WEEK * 1);
        await moveBlock(1);

        // 用户3质押
        let user3 = await getUser(2);
        console.log("user3=",user3.address);

        await (await token.transfer(user3.address,amount)).wait();
        console.log("用户2的token余额=",await token.balanceOf(user2.address));

        await (await token.connect(user3).approve(veToken.address,amount)).wait();

        unLockedTime = await blockInfo() + DELAY_WEEK * 10;
        let veToken3 = veToken.connect(user3);
        await veToken3.createLock(amount,unLockedTime,gas);

        // 第1种场景，移动8周，相当于移动到最后一周
        // 第N种场景，移动从1~8周之间测式移动，查看公式的准确性
        await moveTime(DELAY_WEEK * 10);
        await moveBlock(1);
        await blockInfo();

        let totalClaimableNum = await veToken.totalClaimable();
        console.log("当前总的待领取总量：",totalClaimableNum);
        await veToken._checkpointTotalSupply();
        let user1ClaimableNum = await veToken.claimableToken(deployerAddress);
        let user2ClaimableNum = await veToken.claimableToken(user2.address);
        let user3ClaimableNum = await veToken.claimableToken(user3.address);
        console.log("总奖励时长：",await veToken.maxRewardDuration());
        console.log("A用户可领取总量：",user1ClaimableNum);
        console.log("B用户可领取总量：",user2ClaimableNum);
        console.log("C用户可领取总量：",user3ClaimableNum);
        // console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));
        console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)).sub(toBN(user2ClaimableNum)).sub(toBN(user3ClaimableNum)));
        // expect(true).to.equal(totalClaimableNum-user1ClaimableNum-user2ClaimableNum == 0);
    });

    it("->用户质押常规测式",async ()=>{
      const amount = ethers.utils.parseUnits("100");
      console.log("amount = ",amount);

      //token授权给veToken
      let approveTx = await token.approve(veToken.address,amount+"");
      await approveTx.wait();
      console.log(`已授权成功！`);
      console.log("A 可用余额=",await token.balanceOf(deployerAddress))

      //默认用户质押10周
      console.log("总的奖励数：",await veToken.totalReward());
      console.log("总奖励时长：",await veToken.maxRewardDuration());
      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      console.log("质押锁定时间：",unLockedTime);
      console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      await (await veToken.createLock(amount,unLockedTime)).wait();

      console.log("----------------1------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
      let totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
      let user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));


      console.log("----------------2------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------3------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------4------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------5------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------6------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------7------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------8------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------9------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.log("----------------10------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));

      console.warn("----------------11------------------")
      await moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      
      
       totalClaimableNum = await veToken.totalClaimable();
      console.log("当前总的待领取总量：",totalClaimableNum);
      await veToken._checkpointTotalSupply();
       user1ClaimableNum = await veToken.claimableToken(deployerAddress);
      
      console.log("A用户可领取总量：",user1ClaimableNum);
      console.log("总的奖励数-所有用户的可领取奖励数：",toBN(totalClaimableNum).sub(toBN(user1ClaimableNum)));


      expect(true).to.equal(totalClaimableNum-user1ClaimableNum < 3);
    });
 
});