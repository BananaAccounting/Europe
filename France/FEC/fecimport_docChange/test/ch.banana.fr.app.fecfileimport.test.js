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


// @id = ch.banana.fr.app.fecfileimport.test
// @api = 1.0
// @pubdate = 2021-10-22
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.fr.app.fecfileimport.test.js>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.fr.app.fecfileimport.js
// @timeout = -1

// Register test case to be executed
Test.registerTestCase(new ImportFecFileTest());

// Here we define the class, the name of the class is not important
function ImportFecFileTest() {

}

// This method will be called at the beginning of the test case
ImportFecFileTest.prototype.initTestCase = function() {
    this.testLogger = Test.logger;
    this.progressBar = Banana.application.progressBar;
    this.fileAC2="file:script/../test/testcases/exemple_cd_entreprise.ac2";

}

// This method will be called at the end of the test case
ImportFecFileTest.prototype.cleanupTestCase = function() {

}

// This method will be called before every test method is executed
ImportFecFileTest.prototype.init = function() {

}

// This method will be called after every test method is executed
ImportFecFileTest.prototype.cleanup = function() {

}

ImportFecFileTest.prototype.testTransactionsImport = function() {

    var file = Banana.IO.getLocalFile("file:script/../test/testcases/sirenFEC20190109.txt");
    var stringifyFile = JSON.stringify(file.read(), "", "");
    var parsedFile = JSON.parse(stringifyFile);
    this.testLogger.addCsv("----INITIAL TXT FILE----", parsedFile);

    var csvFile = Banana.Converter.csvToArray(parsedFile, '\t', '');
    this.testLogger.addText("----CONVERSION TXT TO ARRAY----");
    this.testLogger.addText(csvFile);


    var banDoc = Banana.application.openDocument(this.fileAC2);
    if (banDoc) {
    var fec_import = new FrAuditFilesImport(banDoc);
    var format=fec_import.createJsonDocument(csvFile);
    var jsonDoc = { "format": "documentChange", "error": "" };
    jsonDoc["data"] = fec_import.jsonDocArray;

    this.testLogger.addText("----IMPORT TRANSACTIONS WITH DOCUMENT CHANGE STRUCTURE----");
    this.testLogger.addJson("name", JSON.stringify(jsonDoc));
    }  else {
        this.testLogger.addFatalError("File not found: " + this.fileAC2);
    }

}

