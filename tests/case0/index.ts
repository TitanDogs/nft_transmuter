import { importTest } from "../utils/helpers";

//cancel a transmuter

describe("Transmuter case 0", () => {
  importTest("Set up tests", `${__dirname}/1_init`);
  importTest("Transmuter tests", `${__dirname}/2_transmuter`);
  importTest("User tests", `${__dirname}/3_user`);
});
