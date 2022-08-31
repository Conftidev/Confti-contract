const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert, AssertionError } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils} = require("ethers");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

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

async function moveTimeToLast() {
  let current_time = await blockInfo()
  let last_time = parseInt(current_time/DELAY_WEEK + 1) * DELAY_WEEK;
  await moveTime(last_time - current_time + 600);
  await moveBlock(1);
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

async function getAddr(account){
    return await account.address
}


async function efail(action,name){
  let result = false
  try {
    console.log("异常断言:"+name);
    await action
    result = true;
    console.log("预期异常,但是通过:"+name);
  } catch (error) {
    console.log("预期异常,结果异常:"+name);
  }finally{
    if(result) throw "预期异常, 但是通过:"+name;
  }
}
async function epass(action,name){
  try {
    console.log("正确断言:"+name);
    await action
    console.log("预期正确,结果正确:"+name);
  } catch (error) {
    console.log("预期正确,结果错误:"+name);
    throw "预期正确,结果错误:"+name+error;
  }
}

async function getUser(index){
    const accounts = await hre.ethers.getSigners();
    const user = accounts[index];
    console.log(user.address);
    return user;
}
async function blockInfo(){
    console.log("区块号:",await provider.getBlockNumber());
    console.log("区块时间:",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}

async function getRouter(factory, routerTemplate,user){

    let mint = await factory.mint(routerTemplate.address,"testx")
    await mint.wait(1);

    const Router = await hre.ethers.getContractFactory("Router"); 
    const router = await Router.attach(factory.lastMint(user.address));
    console.log("mint success, router address:" + await router.address);

    return router.connect(user);
}

async function getIssueRouter(factory, routerTemplate,ntoken,user){
  router = await getRouter(factory, routerTemplate,user);
  const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
  console.log("【aprove】");
  await setApprovalForAll.wait(1);

  const deposit = await router.curatorDeposit(
    [ntoken.address],
    [1],
    [5]
    ,gas);
  await deposit.wait(1); 
  let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  await issue.wait(1); 
  return router;
}

async function getVault(router,user){
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.attach(router.vault());
  return vault.connect(user);
}
async function getVetoken(router,user){
  const VeToken = await hre.ethers.getContractFactory("VeToken");
  const vetoken = await VeToken.attach(router.veToken());
  return vetoken.connect(user);
}
async function getDivision(router,user){
  const Division = await hre.ethers.getContractFactory("Division");
  const division = await Division.attach(router.division());
  return division.connect(user);
}

describe("测式VeToken合约", async ()=> {

  async function deployTokenFixture(){  
        const VeToken = await hre.ethers.getContractFactory("VeToken");
        const veTokenContract = await VeToken.deploy();
        await veTokenContract.deployed();
        console.log("veTokenContract deployed to:", veTokenContract.address);
      
        const Vote = await hre.ethers.getContractFactory("Vote");
        const voteContract = await  Vote.deploy();
        await voteContract.deployed();
        console.log("VoteContract deployed to:", voteContract.address);
      
        const Auction = await hre.ethers.getContractFactory("Auction");
        const auctionContract = await  Auction.deploy();
        await auctionContract.deployed();
        console.log("auctionContract deployed to:", auctionContract.address);
        
        const Vault = await hre.ethers.getContractFactory("Vault");
        const vaultContract = await  Vault.deploy();
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

        const Division = await hre.ethers.getContractFactory("Division"); 
        const divisionContract = await  Division.deploy();
        await divisionContract.deployed();
        console.log("divisionContract deployed to:", divisionContract.address);
      
        const Router = await hre.ethers.getContractFactory("Router"); 
        const routerContract = await Router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await routerContract.deployed();
        console.log("routerContract deployed to:", routerContract.address);
      
        let setLogic = await factoryContract.setLogic(routerContract.address,true,gas)
        await setLogic.wait(1);  
        console.log("setLogic true");

        const user = await getUser(1);
        const ufactory = factoryContract.connect(user);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        const ntokenx = await  TestERC11555.deploy();
      
        await ntokenx.deployed();
        ntoken = ntokenx.connect(user);

        const mint1 = await ntoken.mintBatch(user.address,10,gas);
        await mint1.wait(1);
        
        console.log("ntoken 1 success:" + await ntoken.address);

        const router = await getIssueRouter(ufactory,routerContract,ntoken,user);      
        const vault = await Vault.attach(router.vault()).connect(user);
        const vetoken = await VeToken.attach(router.veToken()).connect(user);
        const vote = await Vote.attach(router.vote()).connect(user);
        const auction = await Auction.attach(router.auction()).connect(user);
        const token = await Division.attach(router.division()).connect(user);
        console.log(await vault.address);
        console.log(await vetoken.address);
        console.log(await auction.address);
        console.log(await token.address);
        console.log(await vote.address);


        const amount = ethers.utils.parseUnits("4500");
        console.log("amount=",amount);
        let mybalance = await token.balanceOf(user.address)
        console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

        return {router,vault,vetoken,auction,token,vote,user,ntoken,routerContract,ufactory};

    }

   
    xit("createLock: 未授权转账,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken,factory} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      let timestamp = await blockInfo();
      console.log(timestamp);
      let unLockedTime = timestamp + DELAY_WEEK * 5;
      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}

    });
    xit("createLock: 授权金额小于质押金额,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.sub(1));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = blockInfo() + DELAY_WEEK * 5;
      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}
    });
    xit("createLock: 质押金额大于可用余额,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("10000");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = blockInfo() + DELAY_WEEK * 5;
      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}
    });
    xit("createLock: 已创建质押,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx = await vetoken.createLock(amount,unLockedTime);
      await tx.wait(1);

      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}
    });
    xit("createLock: 质押已到期,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await tx.wait(1);

      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("五周后VE权益=",veOfAfter5Week.toString());

      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}
    });
    xit("createLock: 质押金额 =0 应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("0");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}

    });
    xit("createLock: 质押金额 <0 应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let a2 = amount.sub(ethers.utils.parseUnits("200"));
      console.log(a2)
      try{await vetoken.createLock(a2,unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}

    });
    xit("createLock: 解锁时间大于当前时间+最大质押时长,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 11;
      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}

    });
    xit("createLock: 解锁时间小于当前时间,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() - 100;
      try{await vetoken.createLock(amount+"",unLockedTime);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:createLock")}

    });

    xit("createLock: 拍卖开始,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");


      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await efail(vetoken.createLock(amount+"",unLockedTime),"createLock");

    });
    xit("createLock: 拍卖结束,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");
  
      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await epass(auction.end(),"end");

      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await efail(vetoken.createLock(amount+"",unLockedTime),"createLock");

    });

    xit("createLock: 正常流程", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      console.log("个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");


      await moveTimeToLast();
      
      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      let createLock = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock,"createLock");
      
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);


      console.log("vetoken=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward=",await vetoken.claimableToken(user.address));
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken1=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward1=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward2=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken3=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward3=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken4=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward4=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken5=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward5=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken6=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward6=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken7=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward7=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken8=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward8=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken9=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward9=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken10=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward10=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken11=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward11=",await vetoken.claimableToken(user.address));

      
    });
    
    xit("claim: 质押赎回后,领取奖励,再质押,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      await moveTimeToLast();
      let unLockedTime = await blockInfo() + DELAY_WEEK * 2;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");
      
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);


      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      await moveTime(DELAY_WEEK * 4);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:",await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("第一次领取金额",after_balance1-befor_balance1)
      expect(true).to.equal(after_balance1-befor_balance1>499.00)

      await epass(vetoken.withdraw(),"withdraw");

      console.log("withdraw 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      let unLockedTime2 = await blockInfo() + DELAY_WEEK * 2;

      let createLock = await vetoken.createLock(amount,unLockedTime2);
      await epass(createLock,"createLock");

      console.log("createLock 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      moveTime(DELAY_WEEK * 4);
      await moveBlock(1);
      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      let befor_balance2 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance2);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:",await vetoken.claimableToken(user.address));
      await epass(vetoken.claim(),"claim");

      let after_balance2 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance2);
      console.log("第二次领取金额",after_balance2-befor_balance2)
      expect(true).to.equal(after_balance2-befor_balance2>499.00)

      await epass(vetoken.withdraw(),"withdraw");

      console.log("withdraw 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));
    });
    xit("claim: 质押半周,应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      let unLockedTime = await blockInfo() +  DELAY_WEEK/2;
      let createLock1 = vetoken.createLock(amount,unLockedTime);
      await efail(createLock1,"createLock1");
    
    });
    xit("claim: 质押6天23小时,应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      let unLockedTime = await blockInfo() +  DELAY_WEEK/7*6 + 3600*23;
      let createLock1 = vetoken.createLock(amount,unLockedTime);
      await efail(createLock1,"createLock1");
    
    });
    xit("claim: 质押一周,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
   
      await moveTimeToLast();
      let unLockedTime = await blockInfo() +  DELAY_WEEK;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:",await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

    });
    xit("claim: 质押一周+100秒,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
   
      await moveTimeToLast();
      let unLockedTime = await blockInfo() +  DELAY_WEEK*2;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:",await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

    });
    xit("claim: 质押两周,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      await moveTimeToLast();
      let unLockedTime = await blockInfo() +  DELAY_WEEK*2;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:",await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

    });
    xit("claim: 质押两周+100秒,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      let unLockedTime = await blockInfo() +  DELAY_WEEK*3;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:"+await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

    });
    xit("claim: 质押三周,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      let unLockedTime = await blockInfo() +  DELAY_WEEK*3;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:",await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

    });
    xit("claim: 质押三周,两个用户,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      let unLockedTime = await blockInfo() +  DELAY_WEEK*2 + 100;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");

      
      let user2 = await getUser(2);
      const transfer = await token.transfer(user2.address,amount)
      await epass(transfer,"transfer")

      let vetoken2 = vetoken.connect(user2);
      let token2 = token.connect(user2);

      //token授权给veToken
      let approveTx2 = await token2.approve(vetoken2.address,amount+"");
      await epass(approveTx2,"approve2");
  
      //质押
      let tx2 = await vetoken2.createLock(amount+"",unLockedTime);
      await epass(tx2,"createLock2");
      console.log("刚质押数据2: ",await vetoken2.userPointHistory(user2.address,1));
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:"+await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

      let befor_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("个人token余额2:",befor_balance2);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励2:"+await vetoken.claimableToken(user2.address));

      await epass(vetoken2.claim(),"claim2");

      let after_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("claim 个人token余额2:",after_balance2);
      console.log("领取金额2",after_balance2-befor_balance2)

      await epass(vetoken2.withdraw(),"withdraw2");

    });
    xit("claim: 质押三周,两个用户,2:1,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("200");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      let unLockedTime = await blockInfo() +  DELAY_WEEK*3;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");

      
      let user2 = await getUser(2);
      const transfer = await token.transfer(user2.address,amount.div(2))
      await epass(transfer,"transfer")

      let vetoken2 = vetoken.connect(user2);
      let token2 = token.connect(user2);

      //token授权给veToken
      let approveTx2 = await token2.approve(vetoken2.address,amount+"");
      await epass(approveTx2,"approve2");
  
      //质押
      let tx2 = await vetoken2.createLock(amount.div(2),unLockedTime);
      await epass(tx2,"createLock2");
      console.log("刚质押数据2: ",await vetoken2.userPointHistory(user2.address,1));
      
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:"+await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

      let befor_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("个人token余额2:",befor_balance2);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励2:"+await vetoken.claimableToken(user2.address));

      await epass(vetoken2.claim(),"claim2");

      let after_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("claim 个人token余额2:",after_balance2);
      console.log("领取金额2",after_balance2-befor_balance2)

      await epass(vetoken2.withdraw(),"withdraw2");

    });
    xit("claim: 质押三周,两个用户,第二个用户延迟一周质押,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      await moveTimeToLast();
      await moveTime(100);
      await moveBlock(1);
      let unLockedTime = await blockInfo() +  DELAY_WEEK*3;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");

      
      let user2 = await getUser(2);
      const transfer = await token.transfer(user2.address,amount)
      await epass(transfer,"transfer")

      let vetoken2 = vetoken.connect(user2);
      let token2 = token.connect(user2);

      //token授权给veToken
      let approveTx2 = await token2.approve(vetoken2.address,amount+"");
      await epass(approveTx2,"approve2");
  
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);

      let unLockedTime2 = await blockInfo() +  DELAY_WEEK*3;
      let tx2 = await vetoken2.createLock(amount+"",unLockedTime2);
      await epass(tx2,"createLock2");
      console.log("刚质押数据2: ",await vetoken2.userPointHistory(user2.address,1));
      
      console.log("vetoken0=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward0=",await vetoken.claimableToken(user.address));
      console.log("2vetoken0=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward1=0",await vetoken.claimableToken(user2.address));


      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken1=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward1=",await vetoken.claimableToken(user.address));
      console.log("2vetoken1=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward1=1",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward2=",await vetoken.claimableToken(user.address));
      console.log("2vetoken2=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward1=2",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken3=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward3=",await vetoken.claimableToken(user.address));
      console.log("2vetoken3=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward3=",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken4=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward4=",await vetoken.claimableToken(user.address));
      console.log("2vetoken4=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward4=",await vetoken.claimableToken(user2.address));

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:"+await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

      let befor_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("个人token余额2:",befor_balance2);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励2:"+await vetoken.claimableToken(user2.address));

      await epass(vetoken2.claim(),"claim2");

      let after_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("claim 个人token余额2:",after_balance2);
      console.log("领取金额2",after_balance2-befor_balance2)

      await epass(vetoken2.withdraw(),"withdraw2");

    });
    xit("claim: 质押三周,两个用户,第二个用户延迟半周质押,领取奖励", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      await epass(approveTx,"approve");
      
      await moveTimeToLast();
      await moveTime(100);
      await moveBlock(1);
      let unLockedTime = await blockInfo() +  DELAY_WEEK*3;
      let createLock1 = await vetoken.createLock(amount,unLockedTime);
      await epass(createLock1,"createLock1");

      
      let user2 = await getUser(2);
      const transfer = await token.transfer(user2.address,amount)
      await epass(transfer,"transfer")

      let vetoken2 = vetoken.connect(user2);
      let token2 = token.connect(user2);

      //token授权给veToken
      let approveTx2 = await token2.approve(vetoken2.address,amount+"");
      await epass(approveTx2,"approve2");
  
      moveTime(DELAY_WEEK/2);
      await moveBlock(1);

      let unLockedTime2 = await blockInfo() +  DELAY_WEEK*3;
      let tx2 = await vetoken2.createLock(amount+"",unLockedTime2);
      await epass(tx2,"createLock2");
      console.log("刚质押数据2: ",await vetoken2.userPointHistory(user2.address,1));
      
      moveTime(DELAY_WEEK/2);
      await moveBlock(1);
      console.log("vetoken0=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward0=",await vetoken.claimableToken(user.address));
      console.log("2vetoken0=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward1=0",await vetoken.claimableToken(user2.address));


      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken1=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward1=",await vetoken.claimableToken(user.address));
      console.log("2vetoken1=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward1=1",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward2=",await vetoken.claimableToken(user.address));
      console.log("2vetoken2=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward1=2",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken3=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward3=",await vetoken.claimableToken(user.address));
      console.log("2vetoken3=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward3=",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken4=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward4=",await vetoken.claimableToken(user.address));
      console.log("2vetoken4=",await vetoken.userOfEquity(user2.address));
      await vetoken._checkpointTotalSupply();
      console.log("2reward4=",await vetoken.claimableToken(user2.address));

      let befor_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("个人token余额:",befor_balance1);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励:"+await vetoken.claimableToken(user.address));

      await epass(vetoken.claim(),"claim");

      let after_balance1 = ethers.utils.formatEther(await token.balanceOf(user.address));
      console.log("claim 个人token余额:",after_balance1);
      console.log("领取金额",after_balance1-befor_balance1)

      await epass(vetoken.withdraw(),"withdraw");

      let befor_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("个人token余额2:",befor_balance2);
      await vetoken._checkpointTotalSupply();
      console.log("待领取奖励2:"+await vetoken.claimableToken(user2.address));

      await epass(vetoken2.claim(),"claim2");

      let after_balance2 = ethers.utils.formatEther(await token.balanceOf(user2.address));
      console.log("claim 个人token余额2:",after_balance2);
      console.log("领取金额2",after_balance2-befor_balance2)

      await epass(vetoken2.withdraw(),"withdraw2");

    });
    xit("createLock: 质押到期,未领取奖励,再次质押,奖励累计领取", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 2;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");
      
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);


      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 2);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));

      console.log("个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      await epass(vetoken.withdraw(),"withdraw");

      console.log("withdraw 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      let unLockedTime2 = await blockInfo() + DELAY_WEEK * 2;

      let createLock = await vetoken.createLock(amount,unLockedTime2);
      await epass(createLock,"createLock");

      console.log("createLock 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      moveTime(DELAY_WEEK * 2);
      await moveBlock(1);
      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      console.log("个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      await epass(vetoken.claim(),"claim");

      console.log("claim 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));

      await epass(vetoken.withdraw(),"withdraw");

      console.log("withdraw 个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));
    });


    xit("increaseAmount: 正常流程", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");
      
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);


      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken1=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));

      let increaseAmount = await vetoken.increaseAmount(amount);
      await increaseAmount.wait(1);

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken3=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken4=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken5=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken6=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken7=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken8=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken9=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken10=",await vetoken.userOfEquity(user.address));

    });
    xit("increaseAmount: 拍卖开始,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");
      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await epass(vetoken.createLock(amount+"",unLockedTime),"createLock");


      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");

      await efail(vetoken.increaseAmount(amount),"increaseAmount");
  

    });
    xit("increaseAmount: 拍卖结束,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await epass(vetoken.createLock(amount+"",unLockedTime),"createLock");

      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");
  
      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await epass(auction.end(),"end");

      await efail(vetoken.increaseAmount(amount),"increaseAmount");

    });
    xit("increaseAmount: 授权金额小于质押金额,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:increaseAmount")}

    });
    xit("increaseAmount: 质押金额大于可用余额,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("4000");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:increaseAmount")}

    });
    xit("increaseAmount: 未创建质押,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:increaseAmount")}

    });
    xit("increaseAmount: 质押已到期,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("五周后VE权益=",veOfAfter5Week.toString());

      try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过:increaseAmount")}

    });
    xit("increaseAmount: 追加质押额度=0 应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      try{await vetoken.increaseAmount(ethers.utils.parseUnits("0"));throw 1}catch(error){if(error==1)throw("预期异常,实际通过:increaseAmount")}

    });
    xit("increaseAmount: 追加质押额度负数,应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      try{await vetoken.increaseAmount(ethers.utils.parseUnits("-1"));throw 1}catch(error){if(error==1)throw("预期异常,实际通过:increaseAmount")}

    });




    xit("increaseUnlockTime: 正常流程", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);

      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");
      
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);


      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken1=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));


      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      let increaseAmount = await vetoken.increaseAmount(amount);
      await increaseAmount.wait(1);

      console.log("vetoken3=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      let increaseUnlockTime = await vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*5);
      await increaseUnlockTime.wait(1);
      console.log("vetoken4=",await vetoken.userOfEquity(user.address));



      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken5=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken6=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken7=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken8=",await vetoken.userOfEquity(user.address));

      await efail(vetoken.withdraw(),"withdraw");

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken9=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken10=",await vetoken.userOfEquity(user.address));

      

      console.log("个人token余额:",ethers.utils.formatEther(await token.balanceOf(user.address)));
      
      let withdraw = await vetoken.withdraw();
      await withdraw.wait(1);
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      

      let claim = await vetoken.claim();
      await claim.wait(1);
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));


      
    });

    xit("increaseUnlockTime: 拍卖开始,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");
      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await epass(vetoken.createLock(amount+"",unLockedTime),"createLock");


      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");

      await efail(vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*5),"increaseUnlockTime");

    });
    xit("increaseUnlockTime: 拍卖结束,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");
      
      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await epass(vetoken.createLock(amount+"",unLockedTime),"createLock");

      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");
  
      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await epass(auction.end(),"end");

      await efail(vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*5),"increaseUnlockTime");

    });

    xit("increaseUnlockTime: 累计质押时长大于最长质押时长应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");
      
      let unLockedTime = await blockInfo() + DELAY_WEEK*5;
      await epass(vetoken.createLock(amount+"",unLockedTime),"createLock");

 
      await efail(vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*6),"increaseUnlockTime");

    });
    xit("increaseUnlockTime: 未创建质押,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      await efail(vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*2),"increaseUnlockTime");

    });
    xit("increaseUnlockTime: 质押已到期,应操作失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("五周后VE权益=",veOfAfter5Week.toString());

      await efail(vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*2),"increaseUnlockTime");

    });

    xit("claim: 质押到期,领取奖励成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);

      const amount = ethers.utils.parseUnits("100");
      console.log("amount=",amount);

      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance))

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");
  

      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      
      await moveTimeToLast();
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      let tx2 = await tx.wait();

      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      
      console.log("vetoken=",await vetoken.userOfEquity(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken1=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward1=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken2=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward2=",await vetoken.claimableToken(user.address));
      
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken3=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward3=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken4=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward4=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken5=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward5=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken6=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward6=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken7=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward7=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken8=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward8=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken9=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward9=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken10=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward10=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken11=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward11=",await vetoken.claimableToken(user.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      console.log("vetoken12=",await vetoken.userOfEquity(user.address));
      await vetoken._checkpointTotalSupply();
      console.log("reward12=",await vetoken.claimableToken(user.address));

      let withdraw = await vetoken.withdraw();
      await withdraw.wait(1);
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      
      claim = await vetoken.claim();
      await claim.wait(1);
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });

    xit("claim: 质押未到期,领取奖励成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("100");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 2);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      await epass(vetoken.claim(),"claim");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });
    xit("claim: 启动拍卖后,领取奖励成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("1000");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");

      moveTime(DELAY_WEEK * 4);
      await moveBlock(1);
      await vetoken._checkpointTotalSupply();
      await epass(vetoken.claim(),"claim");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });
    xit("claim: 拍卖结束后,领取奖励成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("1000");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await epass(auction.end(),"end");
      
      await epass(vetoken.claim(),"claim");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });

    xit("claim: 未质押,应领取失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      await epass(vetoken.claim(),"claim");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });
    xit("claim: 奖励已领取完,不能超发", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("4900");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = await blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 10);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      await blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      
      await vetoken._checkpointTotalSupply();
      console.log("可领取数=",await vetoken.claimableToken(user.address));
      await epass(vetoken.claim(),"claim");
      await epass(vetoken.withdraw(),"withdraw");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));




      let user2 = await getUser(2);
      const transfer = await token.transfer(user2.address,amount)
      await epass(transfer,"transfer")

      let vetoken2 = vetoken.connect(user2);
      let token2 = token.connect(user2);

      //token授权给veToken
      let approveTx2 = await token2.approve(vetoken2.address,amount+"");
      await epass(approveTx2,"approve");
  
      //质押
      let tx2 = await vetoken2.createLock(amount+"",await blockInfo() +DELAY_WEEK*10);
      await epass(tx2,"createLock");
      console.log("刚质押数据: ",await vetoken2.userPointHistory(user2.address,1));


      //移动10周后
      moveTime(DELAY_WEEK * 10);
      await moveBlock(1);
      //查询10周后个人当前VE权益
      blockInfo();
      let veOfAfter10Week = await vetoken2.userOfEquity(user2.address);
      console.log("10周后VE权益=",veOfAfter10Week.toString());
      
      mybalance = await token2.balanceOf(user2.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      console.log("------》");
      await vetoken2._checkpointTotalSupply();
      console.log("reward=",await vetoken2.claimableToken(user2.address));
      console.log("剩余量=",await vetoken2.totalReward() - await vetoken2.totalClaimedReward());
      console.log("最大质押时长=",await vetoken2.maxPledgeDuration());
      console.log("最大奖励时长=",await vetoken2.maxRewardDuration());
      console.log("第一次质押时间=",await vetoken2.firstDepositTime());
      await epass(vetoken2.claim(),"claim");
      await epass(vetoken2.withdraw(),"withdraw");

      mybalance = await token2.balanceOf(user2.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });

    it("claim: 测试奖励领取完", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("100");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = await blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      moveTime(DELAY_WEEK * 2);
      await moveBlock(1);

      let user2 = await getUser(2);
      const transfer = await token.transfer(user2.address,amount)
      await epass(transfer,"transfer")

      let vetoken2 = vetoken.connect(user2);
      let token2 = token.connect(user2);

      //token授权给veToken
      let approveTx2 = await token2.approve(vetoken2.address,amount+"");
      await epass(approveTx2,"approve");
  
      //质押
      let tx2 = await vetoken2.createLock(amount+"",await blockInfo() +DELAY_WEEK*10);
      await epass(tx2,"createLock");
      console.log("刚质押数据: ",await vetoken2.userPointHistory(user2.address,1));

      moveTime(DELAY_WEEK * 6);
      await moveBlock(1);

      await vetoken._checkpointTotalSupply();
      console.log("vetoken8=",await vetoken.userOfEquity(user.address));
      console.log("reward8=",await vetoken.claimableToken(user.address));
      console.log("2vetoken8=",await vetoken.userOfEquity(user2.address));
      console.log("2reward8=",await vetoken.claimableToken(user2.address));


      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);

      await vetoken._checkpointTotalSupply();
      console.log("vetoken9=",await vetoken.userOfEquity(user.address));
      console.log("reward9=",await vetoken.claimableToken(user.address));
      console.log("2vetoken9=",await vetoken.userOfEquity(user2.address));
      console.log("2reward9=",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);

      await vetoken._checkpointTotalSupply();
      console.log("vetoken10=",await vetoken.userOfEquity(user.address));
      console.log("reward10=",await vetoken.claimableToken(user.address));
      console.log("2vetoken10=",await vetoken.userOfEquity(user2.address));
      console.log("2reward10=",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);

      await vetoken._checkpointTotalSupply();
      console.log("vetoken11=",await vetoken.userOfEquity(user.address));
      console.log("reward11=",await vetoken.claimableToken(user.address));
      console.log("2vetoken11=",await vetoken.userOfEquity(user2.address));
      console.log("2reward11=",await vetoken.claimableToken(user2.address));

      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);

      await vetoken._checkpointTotalSupply();
      console.log("vetoken12=",await vetoken.userOfEquity(user.address));
      console.log("reward12=",await vetoken.claimableToken(user.address));
      console.log("2vetoken12=",await vetoken.userOfEquity(user2.address));
      console.log("2reward12=",await vetoken.claimableToken(user2.address));


      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      
      await vetoken._checkpointTotalSupply();
      console.log("可领取数=",await vetoken.claimableToken(user.address));
      await epass(vetoken.claim(),"claim");
      await epass(vetoken.withdraw(),"withdraw");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));


      let veOfAfter10Week = await vetoken2.userOfEquity(user2.address);
      console.log("10周后VE权益=",veOfAfter10Week.toString());
      
      mybalance = await token2.balanceOf(user2.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      console.log("------》");
      await vetoken2._checkpointTotalSupply();
      console.log("reward=",await vetoken2.claimableToken(user2.address));
      console.log("totalReward=",await vetoken2.totalReward());
      console.log("totalClaimedReward=",await vetoken2.totalClaimedReward());

      console.log("剩余量=",await vetoken2.totalReward() - await vetoken2.totalClaimedReward());
      console.log("最大质押时长=",await vetoken2.maxPledgeDuration());
      console.log("最大奖励时长=",await vetoken2.maxRewardDuration());
      console.log("第一次质押时间=",await vetoken2.firstDepositTime());
      await epass(vetoken2.claim(),"claim");
      await epass(vetoken2.withdraw(),"withdraw");

      mybalance = await token2.balanceOf(user2.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });

    xit("claim: 预留质押奖励为0,领取金额应是0  &&  withdraw: 质押到期,领取奖励成功", async ()=>{
      const {user,ntoken,ufactory,routerContract} = await loadFixture(deployTokenFixture);

      let mint = await ufactory.mint(routerContract.address,"testx")
      await mint.wait(1);
  
      const Router = await hre.ethers.getContractFactory("Router"); 
      const router = await Router.attach(ufactory.lastMint(user.address)).connect(user);
      console.log("mint success, router address:" + await router.address);

      const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true);
      await setApprovalForAll.wait(1);
      console.log("【aprove】");


      const deposit = await router.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        );
      await deposit.wait(1); 
      console.log("deposit");
      let issue  = await router.issue(utils.parseUnits("100000",18) ,"Tcoin",0,utils.parseUnits("1",18),6048000,6048000)
      await issue.wait(1); 

      let supply = 10n**23n;
      let user_expect_amount = supply*(10000n - 100n)/10000n;
      console.log(user_expect_amount);


      const Division = await hre.ethers.getContractFactory("Division"); 
      const division = await Division.attach(await router.division()).connect(user);
      const VeToken = await hre.ethers.getContractFactory("VeToken"); 
      const vetoken = await VeToken.attach(await router.veToken()).connect(user);
      const user_amount = await division.balanceOf(user.address)
      console.log(user_amount);

      const amount = ethers.utils.parseUnits("5000",18);
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",division.address);

      let mybalance = await division.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await division.approve(vetoken.address,amount);
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 1;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      //移动10周后
      moveTime(DELAY_WEEK * 10);
      await moveBlock(1);
      //查询10周后个人当前VE权益
      blockInfo();
      let veOfAfter10Week = await vetoken.userOfEquity(user.address);
      console.log("10周后VE权益=",veOfAfter10Week.toString());
      
      mybalance = await division.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      
      await epass(vetoken.claim(),"claim");
      await epass(vetoken.withdraw(),"withdraw");

      
      mybalance = await division.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      expect(0).to.equal(Number(99000) - ethers.utils.formatEther(mybalance));
    });



    
    
    xit("withdraw: 质押未到期,提取应失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("100");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      await efail(vetoken.withdraw(),"withdraw");
      

    });
    xit("withdraw: 启动拍卖后,提取成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("100");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 1);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");


      await epass(vetoken.withdraw(),"withdraw");
      // await epass(vetoken.claim(),"claim");

      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });
    xit("withdraw: 拍卖结束后,提取成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      const amount = ethers.utils.parseUnits("100");

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount+"");
      await epass(approveTx,"approve");
  
      //质押
      let TotalR = await vetoken.totalReward();
      console.log("TotalR = ",TotalR)
      let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
      console.log("质押锁定时间:",unLockedTime);
      console.log("质押锁定时间对应周时间:",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
      let tx = await vetoken.createLock(amount+"",unLockedTime);
      await epass(tx,"createLock");
      console.log("刚质押数据: ",await vetoken.userPointHistory(user.address,1));

      //查询个人当前VE权益
      let lastBlkTime = blockInfo();
      let ve = await vetoken.userOfEquity(user.address);
      console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
      console.log("VE权益=",ve.toString());

      //移动1周后
      moveTime(DELAY_WEEK * 5);
      await moveBlock(1);
      //查询5周后个人当前VE权益
      blockInfo();
      let veOfAfter5Week = await vetoken.userOfEquity(user.address);
      console.log("1周后VE权益=",veOfAfter5Week.toString());
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await epass(a2.start({value : utils.parseUnits("1.1",18)}),"start");

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await epass(auction.end(),"end");
      
      await epass(vetoken.withdraw(),"withdraw");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });

    xit("withdraw: 未质押,应提取失败", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));
      
      await epass(vetoken.withdraw(),"withdraw");
      
      mybalance = await token.balanceOf(user.address)
      console.log("个人token余额:",ethers.utils.formatEther(mybalance));

    });

});
