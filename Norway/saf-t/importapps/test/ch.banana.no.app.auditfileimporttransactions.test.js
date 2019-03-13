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
// @id = ch.banana.no.app.auditfileimporttransactions.test
// @api = 1.0
// @pubdate = 2019-02-18
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.no.app.auditfileimporttransactions.js>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.no.app.auditfileimporttransactions.js
// @timeout = -1


// Register test case to be executed
Test.registerTestCase(new ImportTransactionsTest());

// Here we define the class, the name of the class is not important
function ImportTransactionsTest() {

}

// This method will be called at the beginning of the test case
ImportTransactionsTest.prototype.initTestCase = function() {

}

// This method will be called at the end of the test case
ImportTransactionsTest.prototype.cleanupTestCase = function() {

}

// This method will be called before every test method is executed
ImportTransactionsTest.prototype.init = function() {

}

// This method will be called after every test method is executed
ImportTransactionsTest.prototype.cleanup = function() {

}

ImportTransactionsTest.prototype.testBananaApps = function() {

    var filePath = "";

    filePath = "file:script/../test/testcases/example_file_saft_financial.xml";
    this.displayData(filePath);

}

ImportTransactionsTest.prototype.displayData = function(filePath) {

    var file = Banana.IO.getLocalFile(filePath);
    var parsedfile = JSON.stringify(file.read(), "", "");
    var xmlfile = JSON.parse(parsedfile);

    var form = [];
    loadForm(xmlfile,form);

    Test.logger.addText("--- TRANSACTIONS LINES ---");
    var doc = "";
    for (var i = 0; i < form.length; i++) {
        if (doc !== form[i].Doc) {
            Test.logger.addText("**********");
            doc = form[i].Doc;
        }
        Test.logger.addText("Doc:"+form[i].Doc+", Date:"+form[i].Date+", Description:"+form[i].Description+", DebitAccount:"+form[i].Account+", CreditAccount:"+form[i].ContraAccount +", Amount:"+form[i].Income);
    }

    Test.logger.addText(" ");

    Test.logger.addText("IMPORT FILE");
    var importTransactionsFile = createImportTransactionsFile(form);
    Test.logger.addText(importTransactionsFile);

}





