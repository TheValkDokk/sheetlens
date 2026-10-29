import { explainFormula, extractRefs } from "../../app/src/core/formula";
console.log("explain", explainFormula("=SUM(A1:A3)"));
console.log("refs", JSON.stringify(extractRefs("=LOG10(A1)", "S")));
