import fs from "fs";
import path from "path";
import { exec } from "child_process";

import { CRX_BACKGROUND_OUTDIR } from "./globalConfig.js";

const contentOutDir = path.resolve(process.cwd(), "./dist-crx/content");
const backgroundOutDir = path.resolve(process.cwd(), "./dist-crx/background");

// 删除目录及文件
const deleteDirectory = (dir) => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((file) => {
      const curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // 递归删除子目录
        deleteDirectory(curPath);
      } else {
        // 删除文件
        fs.unlinkSync(curPath);
      }
    });
    // 删除空目录
    fs.rmdirSync(dir);
  }
};

try {
  const files = fs.readdirSync("./src/content");
  // 判断是否存在目录
  if (!fs.existsSync(contentOutDir)) {
    fs.mkdirSync(contentOutDir);
  }

  // 遍历文件列表并复制每个文件到目标目录
  files.forEach((file) => {
    const sourceFile = path.join("./src/content", file);
    const destinationFile = path.join("./dist-crx/content", file);

    fs.copyFile(sourceFile, destinationFile, (err) => {
      if (err) {
        console.error(`复制文件 ${sourceFile} 到 ${destinationFile} 时出错:`, err);
      } else {
        console.log(`文件 ${sourceFile} 已成功复制到 ${destinationFile}`);
      }
    });

    // 将ts文件转为js
    console.log(`执行命令：npx tsc ${destinationFile}生成对应js文件`);
    exec(`npx tsc ${destinationFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行命令时出错：${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`命令标准错误输出：${stderr}`);
        return;
      }
      // console.log(`命令标准输出：${stdout}`);
      fs.unlink(destinationFile, function (err) {
        if (err) console.log(err);
        console.log("删除成功：", destinationFile);
      });
    });
  });

  // background打包文件复制到dist-crx中
  // 判断是否存在目录
  if (!fs.existsSync(backgroundOutDir)) {
    fs.mkdirSync(backgroundOutDir);
  }

  fs.readdirSync("./_build_background").forEach((file) => {
    if (file != "background.js") return;
    // 只复制background.js
    const sourceFile = path.join("./_build_background", file);
    const destinationFile = path.join("./dist-crx/background", file);

    fs.copyFile(sourceFile, destinationFile, (err) => {
      if (err) {
        console.error(`复制文件 ${sourceFile} 到 ${destinationFile} 时出错:`, err);
      } else {
        console.log(`文件 ${sourceFile} 已成功复制到 ${destinationFile}`);
      }
    });
    const buildGroundDir = path.resolve(process.cwd(), CRX_BACKGROUND_OUTDIR);

    deleteDirectory(buildGroundDir);
  });
} catch (error) {
  console.log("读取出错", error);
}



// 实现打包多个脚本
// 将其src/content 复制到 打包目录dist-crx/content中
// 由于是ts文件，需要利用mpx tsc 命令生成js，并删除原ts文件

// 涉及 fs.readdirSync/existsSync/mkdirSync/copyFile 和 子进程 exec 模块
