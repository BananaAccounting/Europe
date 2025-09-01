// Copyright [2025] [Banana.ch SA - Lugano Switzerland]
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// @id = ch.banana.europe.import.sglaydernier
// @api = 1.0
// @pubdate = 2025-08-25
// @publisher = Banana.ch SA
// @description = SG Laydernier - Import movements .csv (Banana+ Advanced)
// @description.it = SG Laydernier - Importa movimenti .csv (Banana+ Advanced)
// @description.en = SG Laydernier - Import movements .csv (Banana+ Advanced)
// @description.de = SG Laydernier - Bewegungen importieren .csv (Banana+ Advanced)
// @description.fr = SG Laydernier - Importer mouvements .csv (Banana+ Advanced)
// @doctype = *
// @docproperties =
// @task = import.transactions
// @outputformat = transactions.simple
// @inputdatasource = openfiledialog
// @inputfilefilter = Text files (*.txt *.csv);;All files (*.*)
// @inputfilefilter.de = Text (*.txt *.csv);;Alle Dateien (*.*)
// @inputfilefilter.fr = Texte (*.txt *.csv);;Tous (*.*)
// @inputfilefilter.it = Testo (*.txt *.csv);;Tutti i files (*.*)
// @timeout = -1
// @includejs = import.utilities.js

/**
 * Parse the data and return the data to be imported as a tab separated file.
 */
function exec(string, isTest) {
  var importUtilities = new ImportUtilities(Banana.document);

  if (isTest !== true && !importUtilities.verifyBananaAdvancedVersion())
    return "";

  let convertionParam = defineConversionParam(string);

  var transactions = Banana.Converter.csvToArray(
    string,
    convertionParam.separator,
    '"'
  );

  // SG Laydernier Format, this format works with the header names.
  var sgLaydernierFormat1 = new SGLaydernierFormat1();
  let transactionsData = sgLaydernierFormat1.getFormattedData(
    transactions,
    importUtilities
  );
//   Banana.console.log(JSON.stringify(transactionsData));
  if (sgLaydernierFormat1.match(transactionsData)) {
    transactions = sgLaydernierFormat1.convert(transactionsData);
    return Banana.Converter.arrayToTsv(transactions);
  }

  // Format is unknow, return an error
  importUtilities.getUnknownFormatError();

  return "";
}

/**
 * SG Laydernier Format
 *
 * "SG FERNEY-VOLTAIRE      "
 * "FR33 1234 5678 1234 8888 6666 222";"Compte Courant"
 * "ABC DEFG"
 * "Solde au";"08/08/2025"
 * "Solde";"2 275,29";"EUR"
 * 
 * Date;Nature de l'opération;Débit;Crédit;Devise;Date de valeur;Libellé interbancaire
 * "17/02/2025";"VAR RAVI    1234567890S";"";"115,00";"EUR";"17/02/2025";"VIT URIBUM SANENT"
 * "";"GD: ATIEF DAITOENGAOENT";"";"";"";"";""
 * ;;;
 * ;;;
 * Datum;Buchungstext;Betrag;Valuta
 * 26.05.25;Dietrich Torino und Niccolo Paganini;200.00;26.05.25
 * 26.05.25;Dietrich Carla Sollis;720.00;26.05.25
 * 26.05.25;Dietrich Yves La Roche;150.00;26.05.25
 * 26.05.25;Dietrich Samuel und Kaitlin Berger;350.00;26.05.25
 */
function SGLaydernierFormat1() {
  /** Return true if the transactions match this format */
  this.match = function (transactionsData) {
    if (transactionsData.length === 0) return false;

    for (var i = 0; i < transactionsData.length; i++) {
      var transaction = transactionsData[i];
      var formatMatched = true;

      if (
        formatMatched &&
        transaction["Date"] &&
        transaction["Date"].length >= 10 &&
        transaction["Date"].match(/^\d{2}\/\d{2}\/\d{4}$/)
      )
        formatMatched = true;
      else formatMatched = false;

      if (formatMatched) return true;
    }

    return false;
  };

  this.convert = function (transactionsData) {
    var transactionsToImport = [];

    // First, consolidate multi-row descriptions
    var consolidatedData = this.consolidateMultiRowDescriptions(transactionsData);

    for (var i = 0; i < consolidatedData.length; i++) {
      if (
        consolidatedData[i]["Date"] &&
        consolidatedData[i]["Date"].length >= 10 &&
        consolidatedData[i]["Date"].match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        transactionsToImport.push(this.mapTransaction(consolidatedData[i]));
      }
    }

    // Sort rows by date
    transactionsToImport = transactionsToImport.reverse();

    // Add header and return
    var header = [
      [
        "Date",
        "DateValue",
        "Doc",
        "ExternalReference",
        "Description",
        "Income",
        "Expenses",
      ],
    ];
    return header.concat(transactionsToImport);
  };

  this.consolidateMultiRowDescriptions = function (transactionsData) {
    var consolidatedData = [];
    
    for (var i = 0; i < transactionsData.length; i++) {
      var transaction = transactionsData[i];
      
      // Check if this is a main transaction row (has a date)
      if (transaction["Date"] && transaction["Date"].length >= 10 && 
          transaction["Date"].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        
        var consolidatedTransaction = Object.assign({}, transaction);
        var descriptions = [transaction["Description"] || ""];
        
        // Look ahead for continuation rows (empty date but has description)
        var j = i + 1;
        while (j < transactionsData.length) {
          var nextRow = transactionsData[j];
          
          // Check if this is a continuation row (empty date but has description)
          if ((!nextRow["Date"] || nextRow["Date"].trim() === "") && 
              nextRow["Description"] && nextRow["Description"].trim() !== "") {
            descriptions.push(nextRow["Description"].trim());
            j++;
          } else {
            break;
          }
        }
        
        // Consolidate all descriptions with space separation
        consolidatedTransaction["Description"] = descriptions.join(" ");
        consolidatedData.push(consolidatedTransaction);
        
        // Skip the processed continuation rows
        i = j - 1;
      }
    }
    
    return consolidatedData;
  };

  this.getFormattedData = function (inData, importUtilities) {
    var columns = importUtilities.getHeaderData(inData, 6); //array
    var rows = importUtilities.getRowData(inData, 7); //array of array
    let form = [];

    let convertedColumns = [];

    convertedColumns = convertHeaderFr(columns);
    
    //Load the form with data taken from the array. Create objects
    if (convertedColumns.length > 0) {
      importUtilities.loadForm(form, convertedColumns, rows);
      return form;
    }

    return [];
  };

  this.mapTransaction = function (transaction) {
    let mappedLine = [];

    mappedLine.push(
      Banana.Converter.toInternalDateFormat(transaction["Date"], "dd.mm.yyyy")
    );
    mappedLine.push(Banana.Converter.toInternalDateFormat(transaction["ValueDate"], "dd.mm.yyyy"));
    mappedLine.push("");
    mappedLine.push("");
    mappedLine.push(transaction["Description"] + "; " + transaction["InterbankLabel"]);
    mappedLine.push(Banana.Converter.toInternalNumberFormat(transaction["CreditAmount"], ","));
    mappedLine.push(Banana.Converter.toInternalNumberFormat(transaction["DebitAmount"].substring(1), ","));

    return mappedLine;
  };
}

function defineConversionParam(inData) {
  var inData = Banana.Converter.csvToArray(inData);
  var header = String(inData[6]);
  var convertionParam = {};
  /** SPECIFY THE SEPARATOR AND THE TEXT DELIMITER USED IN THE CSV FILE */
  convertionParam.format = "csv"; // available formats are "csv", "html"
  //get text delimiter
  convertionParam.textDelim = '"';
  // get separator
  if (header.indexOf(";") >= 0) {
    convertionParam.separator = ";";
  } else {
    convertionParam.separator = ",";
  }

  /** SPECIFY AT WHICH ROW OF THE CSV FILE IS THE HEADER (COLUMN TITLES)
    We suppose the data will always begin right away after the header line */
  convertionParam.headerLineStart = 6;
  convertionParam.dataLineStart = 7;

  /** SPECIFY THE COLUMN TO USE FOR SORTING
    If sortColums is empty the data are not sorted */
  convertionParam.sortColums = ["Date", "Doc"];
  convertionParam.sortDescending = false;

  return convertionParam;
}

function convertHeaderFr(columns) {
  let convertedColumns = [];

  for (var i = 0; i < columns.length; i++) {
    switch (columns[i]) {
        case "Date":
            convertedColumns[i] = "Date";
            break;
        case "Nature de l'opération":
            convertedColumns[i] = "Description";
            break;
        case "Débit":
            convertedColumns[i] = "DebitAmount";
            break;
        case "Crédit":
            convertedColumns[i] = "CreditAmount";
            break;
        case "Devise":
            convertedColumns[i] = "Currency";
            break;
        case "Date de valeur":
            convertedColumns[i] = "ValueDate";
            break;
        case "Libellé interbancaire":
            convertedColumns[i] = "InterbankLabel";
            break;
        default:
            break;
    }
  }

  if (convertedColumns.indexOf("Date") < 0) {
    return [];
  }

  return convertedColumns;
}
