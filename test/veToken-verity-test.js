// 该js用于验证一下想法
//使用说明，在终端执行 npx hardhat test ./test/veToken-verity-test.js
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
      
        const tx  = await newRouterContracy.issue(utils.parseUnits("100000000000",18) ,"Tcoin",1000,utils.parseUnits("100",18),6048000,6048000,gas)
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

        //获得vetoken的代理合约
        const newVeTokenAddress = await newRouterContracy.veToken();
        veToken = await veTokenContract.attach(newVeTokenAddress);
        console.log("vetokenAddress = ",veToken.address);
        // console.log(veToken);
        console.log("totalReward=",await veToken.totalReward());
        console.log("maxPledgeDuration=",await veToken.maxPledgeDuration());
        
    })

    afterEach(()=>{

    })
    
    it("->验证_findTimestampEpoch（t）中的t=合约初始化时间时的拿到的纪元",async ()=>{
      let timeCursor  = await veToken.timeCursor()
      console.log("合约实始化当周的时间：",await veToken.timeCursor())


       //移动0.02周，相当于 移动 3.36小时
       await moveTime(DELAY_WEEK * 0.02);
       await moveBlock(1);
       await blockInfo();



       //token授权给veToken
       const amount = ethers.utils.parseUnits("100");
       console.log("amount=",amount);
       let approveTx = await token.approve(veToken.address,amount+"");
       let approveResult =  await approveTx.wait();
       console.log("授权成功！");
  

       //质押
       let TotalR = await veToken.totalReward();
       console.log("TotalR = ",TotalR)
       let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
       console.log("质押锁定时间：",unLockedTime);
       console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
       let tx = await veToken.createLock(amount+"",unLockedTime);
       let tx2 = await tx.wait();

       console.log("刚质押数据： ",await veToken.supplyPointHistory(1));

       //移动3周
       await moveTime(DELAY_WEEK * 3);
       await moveBlock(1);
       await blockInfo();

       let t = await veToken._checkpointTotalSupply();
       await t.wait();
       console.log("第一周的总周权益：",await veToken.veSupply(timeCursor))
       let week2 = Number(timeCursor) + DELAY_WEEK;
       let week3 = Number(timeCursor)+ DELAY_WEEK*2;
       console.log("week2="+week2);
       console.log("第二周的总周权益：",await veToken.veSupply(week2))
       console.log("week3="+week3);
       console.log("第三周的总周权益：",await veToken.veSupply(week3))


    });

});
