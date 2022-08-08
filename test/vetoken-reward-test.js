//使用说明，在终端执行 npx hardhat test ./test/veToken-reward-test.js
//个人奖励单人测式角本
const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils} = require("ethers");

 
const DELAY_WEEK = 604800; // 1 week
const gas ={
    gasPrice:1097302934,
    gasLimit:6000000
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
 
 

        const [deployer] = await ethers.getSigners();
        deployerAddress = deployer.address;

 
        console.log("deployerAddress=",deployer.address);

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
       
        const mint1 = await TestERC1155Contract.mint(deployerAddress,1,10,gas)
        await mint1.wait(1);
      
        const mint2 = await TestERC1155Contract.mint(deployerAddress,2,10,gas)
        await mint2.wait(1);
        
        const mint3 = await TestERC1155Contract.mint(deployerAddress,3,10,gas)
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
      
        const tx  = await newRouterContracy.issue(utils.parseUnits("10000",18) ,"Tcoin",10,utils.parseUnits("10",18),31449600,31449600,gas)
        console.log("【issue】");
        await tx.wait(1);
        // ----------------------------------------------------------


        //生成 token合约 (Division)
        const newDivisionAddress = await newRouterContracy.division();
        token = await divisionContract.attach(newDivisionAddress);
        console.log("tokenAddress = ",token.address);
        
        let balanceOfMe = await token.balanceOf(deployerAddress)
        console.log(String(balanceOfMe))

 
        const newVeTokenAddress = await newRouterContracy.veToken();
        veToken = await veTokenContract.attach(newVeTokenAddress);
        console.log("vetokenAddress = ",veToken.address);
        // console.log(veToken);
 
 
    })

    afterEach(()=>{

    })
    
 
    // it("->常规测式",async ()=>{
    //     const amount = 100000000000000000000; 
        
    //     //token授权给veToken
    //     let approveTx = await token.approve(veToken.address,amount+"");
    //     let approveResult =  await approveTx.wait();
    //     console.log("授权成功！");

    //     //质押
    //     let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
    //     // console.log("质押锁定时间：",unLockedTime);
    //     console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
    //     let tx = await veToken.createLock(amount+"",unLockedTime);
    //     // console.log("tx=",tx);
    //     // let tx2 = await tx.wait();
    //     // console.log("tx2=",tx2);
    //     let datas = await veToken.userPointHistory(deployerAddress,1);
    //     console.log("刚质押数据： ",datas);

    //     //查询当前用户可领取奖励数量
    //     await blockInfo();
    //     await veToken._checkpointTotalSupply();
    //     console.log("个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     //移动1周后
    //     await moveTime(DELAY_WEEK * 1);
    //     await moveBlock(1);
    //     await blockInfo();
    //     let tx01 = await veToken._checkpointTotalSupply();
    //     // let tx01a = await tx01.wait();
    //     // console.log("tx01a=",tx01a);
    //     let tt1 = parseInt((parseInt(datas.ts) + DELAY_WEEK-1)/DELAY_WEEK) * DELAY_WEEK;
    //     console.log("tt1 = ",tt1);
    //     console.log(await veToken.veSupply(tt1));
    //     console.log("移动一周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     //移动2周后
    //     await moveTime(DELAY_WEEK * 1);
    //     await moveBlock(1);
    //     let tx02 = await veToken._checkpointTotalSupply();
    //     // let tx02a = await tx02.wait();
    //     // console.log("tx02a=",tx02a);
    //     await blockInfo();
    //     let tt2 = parseInt((parseInt(datas.ts) + DELAY_WEEK * 2-1)/DELAY_WEEK) * DELAY_WEEK;
    //     console.log("tt2 = ",tt2);
    //     console.log(await veToken.veSupply(tt2));
    //     console.log("移动二周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     //移动3周后
    //     await moveTime(DELAY_WEEK * 1);
    //     await moveBlock(1);
    //     let tx03 = await veToken._checkpointTotalSupply();
    //     // let tx03a = await tx03.wait();
    //     // console.log("tx03a=",tx03a);
    //     await blockInfo();
    //     let tt3 = parseInt((parseInt(datas.ts) + DELAY_WEEK*3-1)/DELAY_WEEK) * DELAY_WEEK;
    //     console.log("tt3 = ",tt3);
    //     console.log(await veToken.veSupply(tt3));
    //     console.log("移动三周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     //移动4周后
    //     await moveTime(DELAY_WEEK * 1);
    //     await moveBlock(1);
    //     let tx04 = await veToken._checkpointTotalSupply();
    //     // let tx04a = await tx04.wait();
    //     // console.log("tx04a=",tx04a);
    //     await blockInfo();
    //     let tt4 = parseInt((parseInt(datas.ts) + DELAY_WEEK*4-1)/DELAY_WEEK) * DELAY_WEEK;
    //     console.log("tt4 = ",tt4);
    //     console.log(await veToken.veSupply(tt4));
    //     console.log("移动四周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     // //移动5周后
    //     await moveTime(DELAY_WEEK * 5);
    //     await moveBlock(1);
    //     let tx11 = await veToken._checkpointTotalSupply();
    //     // let tx11a = await tx11.wait();
    //     // console.log("tx11a=",tx11a);
    //     await blockInfo();
    //     let tt5 = parseInt((parseInt(datas.ts) + DELAY_WEEK*5-1)/DELAY_WEEK) * DELAY_WEEK;
    //     console.log("tt5 = ",tt5);
    //     console.log(await veToken.veSupply(tt5));
    //     console.log("移动五周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

    // });

    // it("->追加质押数量",async ()=>{
    //     const amount = 100000000000000000000; 
        
    //     // token授权给veToken
    //     let approveTx = await token.approve(veToken.address,amount+"");
    //     let approveResult =  await approveTx.wait();
    //     console.log("授权成功！");

    //     // 质押
    //     let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 10;
    //     console.log("质押锁定时间：",unLockedTime);
    //     console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
    //     let tx = await veToken.createLock(amount+"",unLockedTime);
    //     console.log("tx=",tx);
    //     let tx2 = await tx.wait();
    //     console.log("tx2=",tx2);
    //     let datas = await veToken.userPointHistory(deployerAddress,1);
    //     console.log("刚质押数据： ",datas);

    //     // 查询当前用户可领取奖励数量
    //     await blockInfo();
    //     await veToken._checkpointTotalSupply();
    //     console.log("个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     // 移动1周后
    //     await moveTime(DELAY_WEEK * 1);
    //     await moveBlock(1);
    //     await blockInfo();
    //     let tx01 = await veToken._checkpointTotalSupply();
    //     let tx01a = await tx01.wait();
    //     console.log("tx01a=",tx01a);
    //     let tt1 = parseInt((parseInt(datas.ts) + DELAY_WEEK-1)/DELAY_WEEK) * DELAY_WEEK;
    //     console.log("tt1 = ",tt1);
    //     console.log(await veToken.veSupply(tt1));
    //     console.log("移动一周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

    //     // 追加质押数量
    //     let tx02 = await veToken.increaseAmount(amount+"");
    //     let tx02a = await tx02.wait();
    //     console.log("tx02a=",tx02a);

    //     // 延长质押时间
    //     let t = unLockedTime + DELAY_WEEK * 5;
    //     let tx03 = await veToken.increaseUnlockTime(unLockedTime+"");
    //     let tx03a = await tx03.wait();
    //     console.log("tx03a=",tx03a);

    //     // 提现
    //     await moveTime(DELAY_WEEK * 10);
    //     await moveBlock(1);
    //     await blockInfo();
    //     let tx04 = await veToken.withdraw();
    //     let tx04a = await tx04.wait();
    //     console.log("tx04a=",tx04a);

    // });

    // it("->延长质押时间",async ()=>{
    //     const amount = 100000000000000000000; 
 
        
        // token授权给veToken
        // let approveTx = await token.approve(veToken.address,amount+"");
        // let approveResult =  await approveTx.wait();
        // console.log("授权成功！");

 
        //质押
        // let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 10;
        // console.log("质押锁定时间：",unLockedTime);
        // console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
        // let tx = await veToken.createLock(amount+"",unLockedTime);
        // console.log("tx=",tx);
        // let tx2 = await tx.wait();
        // console.log("tx2=",tx2);
        // let datas = await veToken.userPointHistory(deployerAddress,1);
        // console.log("刚质押数据： ",datas);

        //查询当前用户可领取奖励数量
        // await blockInfo();
        // await veToken._checkpointTotalSupply();
        // console.log("个人当前奖励=",await veToken.claimableToken(deployerAddress));

        //移动1周后
        // await moveTime(DELAY_WEEK * 1);
        // await moveBlock(1);
        // await blockInfo();
        // let tx01 = await veToken._checkpointTotalSupply();
        // let tx01a = await tx01.wait();
        // console.log("tx01a=",tx01a);
        // let tt1 = parseInt((parseInt(datas.ts) + DELAY_WEEK-1)/DELAY_WEEK) * DELAY_WEEK;
        // console.log("tt1 = ",tt1);
        // console.log(await veToken.veSupply(tt1));
        // console.log("移动一周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

        //追加质押数量
        // let tx02 = await veToken.increaseAmount(amount+"");
        // let tx02a = await tx02.wait();
        // console.log("tx02a=",tx02a);

        //延长质押时间
        // let t = unLockedTime + DELAY_WEEK * 5;
        // let tx03 = await veToken.increaseUnlockTime(unLockedTime+"");
        // let tx03a = await tx03.wait();
        // console.log("tx03a=",tx03a);

        //提现
        // await moveTime(DELAY_WEEK * 10);
        // await moveBlock(1);
        // await blockInfo();
        // let tx04 = await veToken.withdraw();
        // let tx04a = await tx04.wait();
        // console.log("tx04a=",tx04a);

    // });

    it("->提现测式",async ()=>{
        await moveTime(3600);
        await moveBlock(1);
        let current = await blockInfo();
        console.log("当前区块时间：",current);
        const amount = utils.parseUnits("1000"); 
        
        // token授权给veToken
        let approveTx = await token.approve(veToken.address,amount+"");
        let approveResult =  await approveTx.wait();
        console.log("授权成功！");

        // 质押
        // let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
        let unLockedTime = current + DELAY_WEEK * 4;
        console.log("质押锁定时间：",unLockedTime);
        console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
        let tx = await veToken.createLock(amount+"",unLockedTime);
        // console.log("tx=",tx);
        let tx2 = await tx.wait();
        // console.log("tx2=",tx2);
        let datas = await veToken.userPointHistory(deployerAddress,1);
        console.log("刚质押数据： ",datas);
        console.log("锁定的数据：",await veToken.locked(deployerAddress));

        // // 查询当前用户可领取奖励数量
        await blockInfo();
        // await veToken._checkpointTotalSupply();
        console.log("个人当前奖励=",await veToken.claimableToken(deployerAddress));

        // 移动2周后
        await moveTime(DELAY_WEEK * 5);
        await moveBlock(1);
        await blockInfo();
        console.log("维护帐本前总帐本最大纪元=",await veToken.epoch());
        // console.log(`当前总帐本检查点=`,await veToken.supplyPointHistory(await veToken.epoch()));
        console.log(`当前用户检查点=`,await veToken.userPointHistory(deployerAddress,await veToken.userPointEpoch(deployerAddress)));
        let tx01 = await veToken._checkpointTotalSupply();
        let tx01a = await tx01.wait();
        let maxEpoch = await veToken.epoch();
        console.log("维护帐本后总帐本最大纪元=",maxEpoch);
        // for(var i=1;i<=maxEpoch;i++){
        //     console.log(`总帐本第${i}个检查点=`,await veToken.supplyPointHistory(maxEpoch));
        // }

        // console.log("tx01a=",tx01a);
        let tt1 = parseInt((parseInt(datas.ts) + DELAY_WEEK-1)/DELAY_WEEK) * DELAY_WEEK;
        let tt2 = Number(tt1)+DELAY_WEEK;
        let tt3 = Number(tt2)+DELAY_WEEK;
        let tt4 = Number(tt3)+DELAY_WEEK;
        // console.log("tt1 = ",tt1);
        console.log(`tt1[${tt1}]=`,await veToken.veSupply(tt1));
        console.log(`tt2[${tt2}]=`,await veToken.veSupply(tt2));
        console.log(`tt3[${tt3}]=`,await veToken.veSupply(tt3));
        console.log(`tt4[${tt4}]=`,await veToken.veSupply(tt4));
        console.log("移动四周后个人当前奖励=",await veToken.claimableToken(deployerAddress));

        // await moveTime(DELAY_WEEK * 4);
        // await moveBlock(4);
        // await blockInfo();

        // let aa = await veToken._checkpointTotalSupply();
        // let aa2 = await aa.wait();

        // console.log("移动8周后个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));
 

    });

});
