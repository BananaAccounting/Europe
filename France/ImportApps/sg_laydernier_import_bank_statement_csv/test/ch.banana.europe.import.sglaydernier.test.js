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
//


// @id = ch.banana.europe.import.sglaydernier.test
// @api = 1.0
// @pubdate = 2025-09-01
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.europe.import.sglaydernier.test>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.europe.import.sglaydernier.sbaa/import.utilities.js
// @includejs = ../ch.banana.europe.import.sglaydernier.sbaa/ch.banana.europe.import.sglaydernier.js
// @timeout = -1

// Register test case to be executed
Test.registerTestCase(new TestImportSGLaydernierTrans());

// Here we define the class, the name of the class is not important
function TestImportSGLaydernierTrans() { }

// This method will be called at the beginning of the test case
TestImportSGLaydernierTrans.prototype.initTestCase = function () {
    this.testLogger = Test.logger;
    this.progressBar = Banana.application.progressBar;
}

// This method will be called at the end of the test case
TestImportSGLaydernierTrans.prototype.cleanupTestCase = function () {

}

// This method will be called before every test method is executed
TestImportSGLaydernierTrans.prototype.init = function () {

}

// This method will be called after every test method is executed
TestImportSGLaydernierTrans.prototype.cleanup = function () {

}

TestImportSGLaydernierTrans.prototype.testImport = function () {
    var fileNameList = [];

    fileNameList.push("file:script/../test/testcases/csv_sg_laydernier_example_format1_20250825.csv");

    var parentLogger = this.testLogger;
    this.progressBar.start(fileNameList.length);

    for (var i = 0; i < fileNameList.length; i++) {
        var fileName = fileNameList[i];
        this.testLogger = parentLogger.newLogger(Banana.IO.fileCompleteBaseName(fileName));

        var file = Banana.IO.getLocalFile(fileName);
        Test.assert(file);
        var fileContent = file.read();
        Test.assert(fileContent);
        var transactions = exec(fileContent, true); //takes the exec from the import script.
        this.testLogger.addCsv('', transactions);

        if (!this.progressBar.step())
            break;
    }

    this.progressBar.finish();
}