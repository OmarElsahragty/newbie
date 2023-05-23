import { validateAndConvertYaml } from "./yaml-validation";
import { newbieGenerator } from "./lib";
const main = async () => {
  if (await validateAndConvertYaml("C:\\Users\\Adham Harb\\Documents\\GitHub\\newbie\\newbie.example.yaml"))
    newbieGenerator(undefined, "C:\\Users\\Adham Harb\\Desktop\\newbie");
};
main();
