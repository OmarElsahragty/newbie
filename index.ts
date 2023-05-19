import fs from "fs-extra";
import Zip from "node-stream-zip";

const zip = new Zip({ file: `${__dirname}/skeleton.zip`, storeEntries: true });

zip.on("ready", () => {
  Object.values(zip.entries()).forEach(async entry => {
    if (entry.isDirectory) return;

    // TODO: GENERATE MISSING FILES BASED ON THE INPUT
    // TODO: MODIFY FILES

    await fs.outputFile(`./generated/${entry.name}`, zip.entryDataSync(entry.name).toString("utf8"));
  });

  zip.close();
});
