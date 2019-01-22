// Copyright [2018] [Banana.ch SA - Lugano Switzerland]
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
//
// @id = ch.banana.fr.app.fecimporttransactions.js
// @api = 1.0
// @pubdate = 2019-01-22
// @publisher = Banana.ch SA
// @description = Fichiers des écritures comptables (FEC) - Importation des mouvements (fichier de texte *.txt)
// @description.fr = Fichiers des écritures comptables (FEC) - Importation des mouvements (fichier de texte *.txt)
// @doctype = *
// @encoding = utf-8
// @task = import.transactions
// @outputformat = transactions.simple
// @inputdatasource = openfiledialog
// @inputencoding = utf-8
// @inputfilefilter = Text files (*.txt *.csv);;All files (*.*)

/*
*   SUMMARY
*
*   Import the transactions taken from the txt file.
*
*
*   Double entry accounting, Transactions table:
*   "AccountDebit" column = "Account" value
*   "AccountCredit" column = "ContraAccount" value
*   "Amount" column = "Income" value;
*
*/

/* Main function */
function exec(inData) {

    if (!Banana.document) {
      return "@Cancel";
    }

    // Convert the txt file to an array of array
    var csvFile = Banana.Converter.csvToArray(inData, '\t', '');
    
    // Create an array with all the JContraAccountGroup taken from the csvFile
    var jContraAccountGroup = [];
    jContraAccountGroup = getJContraAccounGroups(csvFile);

    // Regroup the arrays with the same JContraAccountGroup (belong to the same transaction)
    var transactions = [];
    for (var i = 0; i < jContraAccountGroup.length; i++) {
        transactions.push(getByValue(csvFile, jContraAccountGroup[i]));
    }
    
    // Create the file used to import the transaction in Banana */
    var importTransactionsFile = createImportTransactionsFile(transactions);
    // Banana.console.log(importTransactionsFile);


    // Banana.console.log(inData);
    // Banana.console.log(csvFile);
    // for (var i = 0; i < transactions.length; i++) {
    //     Banana.console.log(JSON.stringify(transactions[i], "",""));
    //     Banana.console.log("***");
    // }

    return importTransactionsFile;
}

// Create the text file used to import the transactions
function createImportTransactionsFile(transactions) {
    
    var importTransactionsFile = "";
    importTransactionsFile += "Date\tDescription\tAccount\tContraAccount\tIncome\n";

    for (var i = 0; i < transactions.length; i++) {
        var date = "";
        var description = "";
        var accountDebit = "";
        var accountCredit = "";
        var debitAmount = "";
        var creditAmount = "";
        var amount = "";

        var checkDebitAmount = "";
        var checkCreditAmount = "";

        //The transaction is on more then 2 lines: 3+ rows from the journal
        if (transactions[i].length > 2) {
            for (var j = 0; j < transactions[i].length; j++) {
                var date = formatDate(transactions[i][j][3]);
                var description = transactions[i][j][10];
                if (transactions[i][j][4] && transactions[i][j][11]) {
                    var accountDebit = transactions[i][j][4];
                    var accountCredit = "";
                    var debitAmount = transactions[i][j][11];
                    importTransactionsFile += date+"\t"+description+"\t"+accountDebit+"\t"+accountCredit+"\t"+debitAmount+"\n";

                    checkDebitAmount = Banana.SDecimal.add(checkDebitAmount, debitAmount);
                }
                else if (transactions[i][j][4] && transactions[i][j][12]) {
                    var accountDebit = "";
                    var accountCredit = transactions[i][j][4];
                    var creditAmount = transactions[i][j][12];
                    importTransactionsFile += date+"\t"+description+"\t"+accountDebit+"\t"+accountCredit+"\t"+creditAmount+"\n";
                    
                    checkCreditAmount = Banana.SDecimal.add(checkCreditAmount, creditAmount);
                }   
            }

            if (checkDebitAmount !== checkCreditAmount) {
                Banana.document.addMessage("Debit amount != Credit amount!!!");
            }

        }
        //The transaction is on one line: 2 rows from the journal
        else {
            for (var j = 0; j < transactions[i].length; j++) {
                var date = formatDate(transactions[i][j][3]);
                var description = transactions[i][j][10];
                if (transactions[i][j][4] && transactions[i][j][11]) {
                    var accountDebit = transactions[i][j][4];
                    var debitAmount = Banana.SDecimal.add(debitAmount,transactions[i][j][11]);
                }
                else if (transactions[i][j][4] && transactions[i][j][12]) {
                    var accountCredit = transactions[i][j][4];
                    var creditAmount = Banana.SDecimal.add(creditAmount,transactions[i][j][12]);
                } 
            }

            importTransactionsFile += date+"\t"+description+"\t"+accountDebit+"\t"+accountCredit+"\t"+debitAmount+"\n";

            if (debitAmount !== creditAmount) {
                Banana.document.addMessage("Debit amount != Credit amount!!!");
            }
        }
    }
    return importTransactionsFile;
}

// Takes all the JContraAccountGroups from the file
function getJContraAccounGroups(csvFile) {
    var values = [];
    for (var i = 1; i < csvFile.length; i++) {
        values.push(csvFile[i][2]); //third column = JContraAccountGroup
    }
    //Removing duplicates
    for (var i = 0; i < values.length; i++) {
        for (var x = i+1; x < values.length; x++) {
            if (values[x] === values[i]) {
                values.splice(x,1);
                --x;
            }
        }
    }
    return values;
}

// Takes all the elements from an array of array with the same value
function getByValue(arr, value) {
    var x = [];
    for (var i=0, iLen=arr.length; i<iLen; i++) {
        if (arr[i][2] == value) {
            x.push(arr[i]);
        }
    }
    return x;
}

// Formats the date
function formatDate(date) {
    return [date.slice(0, 4), "-", date.slice(4, 6), "-", date.slice(6, 8)].join('');
    // 20191231 => return 2019-12-31
}

