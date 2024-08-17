import { importTest } from "../utils/helpers";

describe("Transmuter case 1", () => {
  importTest("Set up tests", `${__dirname}/1_init`);
  importTest("Transmuter tests", `${__dirname}/2_transmuter`);
  importTest("User tests", `${__dirname}/3_user`);
  // importTest("Creator tests", `${__dirname}/4_creator`);
});
