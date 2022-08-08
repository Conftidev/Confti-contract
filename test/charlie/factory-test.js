//使用说明，在终端执行 npx hardhat test ./test/veToken-reward-test.js
//个人奖励单人测式角本
const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert, AssertionError } = require("chai");
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


async function expectFail(action){
    console.log("预期错误")
    let result = false
    try {
      await action.wait()
      result = true;
      console.log("expect fail , but pass");
    } catch (error) {
      console.log("expect fail , right");
    }finally{
      if(result==true) throw "expect erro";
    }
  }
  async function getUser(index){
    const accounts = await hre.ethers.getSigners();
    const user = accounts[index];
    console.log(user.address);
    return user;
}
async function blockInfo(){
    console.log("区块号：",await provider.getBlockNumber());
    console.log("区块时间：",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}

describe("测式Factory合约", async ()=> {
    let factory;
    let ufactory;
    let router;
    let router2;
    let router3;
    let vault;
    let token;
    let veToken;
    let auction;

    let deployerAddress;
    let user;

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
      
        const Router = await hre.ethers.getContractFactory("Router"); 
        router = await Router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await router.deployed();
        console.log("routerContract deployed to:", router.address);
      
        const Router2 = await hre.ethers.getContractFactory("Router"); 
        router2 = await Router2.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await router2.deployed();
        console.log("routerContract2 deployed to:", router2.address);
        
        const Router3 = await hre.ethers.getContractFactory("Router"); 
        router3 = await Router3.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await router3.deployed();
        console.log("routerContract3 deployed to:", router3.address);
        
        // user = await getUser(1);
        factory = factoryContract;
        user = await getUser(1);
        ufactory = factory.connect(user);
    })

    afterEach(()=>{

    })
    
    it("setLogic 测试正常流程 - true",async ()=>{
        let setLogic = await factory.setLogic(router.address,true,gas)
        await setLogic.wait(1);           
    });
    it("setLogic 测试正常流程 - false",async ()=>{
        let setLogic = await factory.setLogic(router.address,false,gas)
        await setLogic.wait(1);           
    });
    it("setLogic 测试无权限",async ()=>{
        let user = await getUser(1);
        let ufactory = factory.connect(user);
        let setLogic = await ufactory.setLogic(router.address,false,gas)
        await expectFail(setLogic);           
    });
    it("setLogic 测试routerTemplate错误，应失败",async ()=>{
        
        let setLogic = await factory.setLogic(factory.address,true,gas)
        await expectFail(setLogic);           
    });
    it("mint 测试：正常流程", async ()=>{
        let setLogic = await factory.setLogic(router.address,true,gas)
        await setLogic.wait(1); 

        let mint =await ufactory.mint(router.address,"test1",gas)
        await mint.wait(1);


        let setLogic2 = await factory.setLogic(router2.address,true,gas)
        await setLogic2.wait(1); 

        let mint2 =await ufactory.mint(router2.address,"test2",gas)
        await mint2.wait(1);

    });
    it("mint 测试, 模板false，应失败", async ()=>{
        let setLogic = await factory.setLogic(router2.address,false,gas)
        await setLogic.wait(1); 

        let mint =await ufactory.mint(router2.address,"test",gas)
        await expectFail(mint);
    });
    it("mint 测试, 模板未设置，应失败", async ()=>{

        let mint =await ufactory.mint(router3.address,"test",gas)
        await expectFail(mint);
    });
});
