// MyTable.js
import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/AddCircleRounded";

const useStyles = makeStyles({
  table: {
    minWidth: 650,
    "& .MuiTableCell-root": {
      border: "0.1rem solid rgba(224, 224, 224, 1)",
    },
  },
});

const MyTable = () => {
  const classes = useStyles();

  const [inputColumns, setInputColumns] = useState([
    { id: "rowIndex", label: "", isReadOnly: true },
    { id: "customerType", label: "Customer Type", isReadOnly: false },
    { id: "deviceModel", label: "Device Model", isReadOnly: false },
  ]);
  const [outputColumns, setOutputColumns] = useState([
    { id: "Price", label: "Price" },
  ]);
  const [data, setData] = useState([
    {
      id: 1,
      input: { customerType: "VIP", deviceModel: "Nokia" },
      output: { Price: 300 },
    },
    {
      id: 2,
      input: { customerType: "Free", deviceModel: "Apple" },
      output: { Price: 50 },
    },
    {
      id: 3,
      input: { customerType: "Gold", deviceModel: "" },
      output: { Price: 60 },
    },
  ]);

  // handle adding column
  const handleAddColumn = (isInput) => {
    const newItemId = uuidv4();
    const newColumnLabel = isInput ? "Select Input" : "Select Output";
    const newColumns = [
      ...(isInput ? inputColumns : outputColumns),
      { id: newItemId, label: newColumnLabel },
    ];
    const updatedData = data.map((row) => {
      return {
        ...row,
        [isInput ? "input" : "output"]: {
          ...row[isInput ? "input" : "output"],
          [newItemId]: "",
        },
      };
    });

    isInput ? setInputColumns(newColumns) : setOutputColumns(newColumns);
    setData(updatedData);
  };

  // handle removing column
  const handleRemoveColumn = (columnId, isInput) => {
    const updatedColumns = (isInput ? inputColumns : outputColumns).filter(
      (column) => column.id !== columnId
    );
    const updatedData = data.map((row) => {
      const { [columnId]: removedColumnValue, ...rest } =
        row[isInput ? "input" : "output"];
      return { ...row, [isInput ? "input" : "output"]: rest };
    });

    isInput
      ? setInputColumns(updatedColumns)
      : setOutputColumns(updatedColumns);
    setData(updatedData);
  };
  const convertJSONtoXML = (jsonData) => {
    const xmlBuilder = new xml2js.Builder();
    const xmlData = {
      definitions: {
        $: {
          xmlns: "https://www.omg.org/spec/DMN/20191111/MODEL/",
          "xmlns:camunda": "http://camunda.org/schema/1.0/dmn",
          id: `definitions_${uuidv4()}`,
          name: "definitions",
          namespace: "http://camunda.org/schema/1.0/dmn",
          exporter: "dmn-js (https://demo.bpmn.io/dmn)",
          exporterVersion: "8.3.0",
        },
        decision: {
          $: { id: "decision", name: "Decision" },
          decisionTable: {
            $: { id: "decisionTable" },
            input: Object.keys(jsonData[0].input).map((key, index) => ({
              $: {
                id: `input${index + 1}`,
                label: key,
                "camunda:inputVariable": key,
              },
              inputExpression: {
                $: { id: `inputExpression${index + 1}`, typeRef: "string" },
                text: "",
              },
            })),
            output: Object.keys(jsonData[0].output).map((key, index) => ({
              $: {
                id: `output${index + 1}`,
                label: key,
                name: key,
                typeRef: "double",
              },
            })),
            rule: jsonData.flatMap((item, index) => {
              return [
                {
                  $: { id: `DecisionRule_${index + 1}` },
                  inputEntry: Object.values(item.input).map((value, i) => ({
                    $: { id: `UnaryTests_${index + 1}${i + 1}` },
                    text: `"${value}"`,
                  })),
                  outputEntry: Object.values(item.output).map((value, i) => ({
                    $: { id: `LiteralExpression_${index + 1}${i + 1}` },
                    text: `"${value}"`,
                  })),
                },
              ];
            }),
          },
        },
      },
    };
    const xmlString = xmlBuilder.buildObject(xmlData);
    return xmlString;
  };

  /** generates and downloads an XML file containing DMN data based on input data.*/
  const downloadXML = (jsonData) => {
    const xmlString = convertJSONtoXML(jsonData);
    fileDownload(xmlString, `${_.camelCase(policyData.name || "dmnData")}.dmn`);
  };

  /** Takes a DMN XML string as input, parses it, normalizes the data, and returns
   * a JSON object with structured table data, input columns, and output columns.*/
  const normalizeArray = (value) => {
    return Array.isArray(value) ? value : [value];
  };
  const replaceDoubleQuotes = (text) => {
    return text.includes('"') ? text.replace(/"/g, "") : text;
  };
  const convertXMLToJSON = (xmlString) => {
    return new Promise((resolve, reject) => {
      xml2js.parseString(
        xmlString,
        { explicitArray: false, mergeAttrs: true },
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          const decisionTable = result?.definitions?.decision?.decisionTable;
          if (!decisionTable) {
            reject(new Error("Invalid DMN XML format"));
            return;
          }
          // Normalize and format input
          const input = normalizeArray(decisionTable.input).map(
            (inputItem) => ({
              id: inputItem["camunda:inputVariable"] || inputItem.label,
              label: inputItem.label,
              isReadOnly: false,
            })
          );
          // Normalize and format output
          const output = normalizeArray(decisionTable.output).map(
            (outputItem) => ({
              id: outputItem.name || outputItem.label,
              label: outputItem.label,
            })
          );
          const jsonData = decisionTable.rule.map((rule, ruleIndex) => {
            const id = ruleIndex + 1;
            // Normalize and format inputValues and outputValues from rule
            const normalizeEntry = (entry, column) =>
              normalizeArray(entry).map((entryItem, index) => ({
                key: column[index].id || column[index].label,
                value: replaceDoubleQuotes(entryItem.text),
              }));
            const inputValues = normalizeEntry(rule.inputEntry, input);
            const outputValues = normalizeEntry(rule.outputEntry, output);
            // create objects from inputValues and outputValues
            return {
              id: id,
              input: Object.fromEntries(
                inputValues.map((item) => [item.key, item.value])
              ),
              output: Object.fromEntries(
                outputValues.map((item) => [item.key, item.value])
              ),
            };
          });
          resolve({
            tableData: jsonData,
            inputColumns: input,
            outputColumns: output,
          });
        }
      );
    });
  };

  /** handles reading and processing of DMN file, converting it from XML to JSON format
   * and updating component states accordingly. */
  const handleDMNFileImport = (event) => {
    const file = event.target.files[0];
    if (file && file.name.includes(".dmn")) {
      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        const xmlString = readerEvent.target.result;
        try {
          // convert the DMN XML to JSON
          const { tableData, inputColumns, outputColumns } =
            await convertXMLToJSON(xmlString);
          // update the component states
          setInputColumns([
            { id: "rowIndex", label: "", isReadOnly: true },
            ...inputColumns,
          ]);
          setOutputColumns(outputColumns);
          setData(tableData);
        } catch (error) {
          console.error("Error converting DMN to JSON:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const uploadMenuItems = [
    {
      label: "Import DMN",
      onClick: () => document.getElementById("dmn-file-input").click(),
    },
    {
      label: "Import Excel",
      onClick: () => console.log("Import Excel clicked"),
    },
  ];

  const downloadMenuItems = [
    { label: "Export DMN", onClick: () => downloadXML(data) },
    {
      label: "Export Excel",
      onClick: () => console.log("Export Excel clicked"),
    },
  ];

  return (
    <TableContainer component={Paper}>
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell align="center" colSpan={2}>
              Input
            </TableCell>
            <TableCell align="center" colSpan={1}>
              Output
            </TableCell>
          </TableRow>
          <TableRow>
            {inputColumns.map((column, index) => (
              <React.Fragment key={column.id}>
                <TableCell style={{ position: "relative" }}>
                  {column.label}
                  <div
                    style={{
                      position: "absolute",
                      right: -25, // Adjust as needed
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 1,
                    }}
                  >
                    <Tooltip title="Add Column">
                      <IconButton onClick={() => handleAddColumn(index)}>
                        <AddIcon
                          style={{
                            color: "limegreen",
                            background: "white",
                            borderRadius: "50%",
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                  </div>
                </TableCell>
              </React.Fragment>
            ))}
            {outputColumns.map((column, index) => (
              <React.Fragment key={column.id}>
                <TableCell style={{ position: "relative" }}>
                  {column.label}
                  <div
                    style={{
                      position: "absolute",
                      right: -25, // Adjust as needed
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 1,
                    }}
                  >
                    <Tooltip title="Add Column">
                      <IconButton onClick={() => handleAddColumn(index)}>
                        <AddIcon
                          style={{
                            color: "limegreen",
                            background: "white",
                            borderRadius: "50%",
                          }}
                        />
                      </IconButton>
                    </Tooltip>
                  </div>
                </TableCell>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/*
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={column.id}>{row[column.id]}</TableCell>
              ))}
            </TableRow>
          ))}
          */}

          {data.map((row, rowIndex) => {
            console.log({ row });
            return (
              <TableRow key={rowIndex}>
                {inputColumns.map((column) => {
                  console.log({ column });
                  if (Object.hasOwn(row.input, column.id)) {
                    return (
                      <TableCell key={column.id}>
                        {row.input[column.id]}
                      </TableCell>
                    );
                  }
                })}
                {outputColumns.map((column) => {
                  console.log({ column });
                  if (Object.hasOwn(row.output, column.id)) {
                    return (
                      <TableCell key={column.id}>
                        {row.output[column.id]}
                      </TableCell>
                    );
                  }
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MyTable;
