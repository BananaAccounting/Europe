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
// @id = ch.banana.no.app.auditfileimporttransactions.js
// @api = 1.0
// @pubdate = 2019-02-18
// @publisher = Banana.ch SA
// @description = Auditfile NOR - Import Transactions (BETA)
// @doctype = *
// @encoding = utf-8
// @task = import.transactions
// @outputformat = transactions.simple
// @inputdatasource = openfiledialog
// @inputencoding = utf-8
// @inputfilefilter = XML files (*.xml);;All files (*.*)

/*
*   SUMMARY
*
*   Import the transactions taken from the xml file.
*
*/


/*
    31.10.2015,Faktura 123456,4000,,7500
    31.10.2015,Faktura 123456,14,,2500
    31.10.2015,Faktura 123456,2740,,2500
    31.10.2015,Faktura 123456,,2400,12500

    31.10.2015,Bilag 5678,2400,,12500
    31.10.2015,Bilag 5678,,1925,12500
*/

// Main function
function exec(inData) {

    if (!Banana.document) {
      return "@Cancel";
    }

    // Load the form with all the accounts row data
    // {"Date":"", "Doc":"", "DocType":"", "Description":"", "Account":"", "ContraAccount":"", "Income":""}
    var form = [];
    loadForm(inData,form);

    // Create the file used to import in Banana
    var importTransactionsFile = createImportTransactionsFile(form);

    return importTransactionsFile;
}

// Load the form that contains all the data used to import
function loadForm(inData, form) {

    var xmlFile = Banana.Xml.parse(inData);
    var xmlRoot = xmlFile.firstChildElement('n1:AuditFile');
    var generalLedgerEntriesNode = xmlRoot.firstChildElement('n1:GeneralLedgerEntries');
    var journalNode = generalLedgerEntriesNode.firstChildElement('n1:Journal');

    while (journalNode) {

        var transactionNode = journalNode.firstChildElement('n1:Transaction'); // First transaction
        while (transactionNode) {

            var trId = "";
            var trDate = "";
            var trDesc = "";

            if (transactionNode.hasChildElements('n1:TransactionID')) {
                trId = transactionNode.firstChildElement('n1:TransactionID').text;
            }
            if (transactionNode.hasChildElements('n1:TransactionDate')) {
                trDate = transactionNode.firstChildElement('n1:TransactionDate').text;
            }
            if (transactionNode.hasChildElements('n1:Description')) {
                trDesc = transactionNode.firstChildElement('n1:Description').text;
            }
            
            //Banana.console.log("NEW TRANSACTION: " + trId + "; " + trDate + "; " + trDesc);

            var lineNode = transactionNode.firstChildElement('n1:Line'); // First lineNode
            while (lineNode) {

                var recordId = "";
                var accountId = "";
                var sourceDocumentId = "";
                var description = "";
                var amount = "";

                if (lineNode.hasChildElements('n1:RecordID')) {
                    recordId = lineNode.firstChildElement('n1:RecordID').text;
                }
                if (lineNode.hasChildElements('n1:AccountID')) {
                    accountId = lineNode.firstChildElement('n1:AccountID').text;
                }
                if (lineNode.hasChildElements('n1:SourceDocumentID')) {
                    sourceDocumentId = lineNode.firstChildElement('n1:SourceDocumentID').text;
                } else {
                    if (lineNode.hasChildElements('n1:ReferenceNumber')) { //if SourceDocumentID does not extist we use ReferenceNumber
                        sourceDocumentId = lineNode.firstChildElement('n1:ReferenceNumber').text;
                    }
                }
                if (lineNode.hasChildElements('n1:Description')) {
                    description = lineNode.firstChildElement('n1:Description').text;
                }
                if (lineNode.hasChildElements('n1:DebitAmount')) {
                    var transactionDebitAccount = accountId;
                    var transactionCreditAccount = "";
                    var debitAmountNode = lineNode.firstChildElement('n1:DebitAmount');
                    if (debitAmountNode.hasChildElements('n1:Amount')) {
                        amount = debitAmountNode.firstChildElement('n1:Amount').text;
                    }
                }
                if (lineNode.hasChildElements('n1:CreditAmount')) {
                    var transactionDebitAccount = "";
                    var transactionCreditAccount = accountId;
                    var creditAmountNode = lineNode.firstChildElement('n1:CreditAmount');
                    if (creditAmountNode.hasChildElements('n1:Amount')) {
                        amount = creditAmountNode.firstChildElement('n1:Amount').text;
                    }
                }
                //Banana.console.log(recordId + "; " + accountId + "; " + sourceDocumentId + "; " + description + "; " + amount);
                
                // Description of the transaction
                var transactionDescription = "";
                if (trDesc) {
                    transactionDescription = trDesc + ", " + description;
                } else {
                    transactionDescription = description;
                }

                // Push data to form
                form.push({"Date":trDate, "Doc":trId, "DocType":"", "Description":transactionDescription, "Account":transactionDebitAccount, "ContraAccount":transactionCreditAccount, "Income":amount});
                
                lineNode = lineNode.nextSiblingElement('n1:Line'); // Next trLine
            }

            transactionNode = transactionNode.nextSiblingElement('n1:Transaction'); // Next transaction
        }
        journalNode = journalNode.nextSiblingElement('n1:Journal'); // Next journal
    }
}

// Create the import text file that is used to import the accounts table in Banana
function createImportTransactionsFile(form) {
    var importTransactionsFile = "";
    // Header
    importTransactionsFile += "Date\tDoc\tDocType\tDescription\tAccount\tContraAccount\tIncome\n";
    // Rows with data
    for (var i = 0; i < form.length; i++) {
        importTransactionsFile += form[i].Date+"\t"+form[i].Doc+"\t"+form[i].DocType+"\t"+form[i].Description+"\t"+form[i].Account+"\t"+form[i].ContraAccount+"\t"+form[i].Income+"\n";
    }
    // Banana.console.log(importTransactionsFile);
    return importTransactionsFile;    
}

