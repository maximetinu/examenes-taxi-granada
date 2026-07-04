#!/usr/bin/env node
/** Genera schema/exam.schema.json (JSON Schema) desde los esquemas Zod. */
import { writeFileSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ExamDocument, Dataset, BankQuestion } from "../schema/exam.ts";

const jsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Exámenes taxi Granada",
  definitions: {
    ExamDocument: zodToJsonSchema(ExamDocument, "ExamDocument").definitions?.ExamDocument ??
      zodToJsonSchema(ExamDocument),
    Dataset: zodToJsonSchema(Dataset),
    BankQuestion: zodToJsonSchema(BankQuestion),
  },
};

writeFileSync("schema/exam.schema.json", JSON.stringify(jsonSchema, null, 2) + "\n");
console.log("Escrito schema/exam.schema.json");
