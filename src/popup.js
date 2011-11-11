//Copyright 2011 Google Inc. All Rights Reserved.

/**
 * @fileoverview This file contains the popup JS which opens the console.
 * @author ekamenskaya@google.com (Ekaterina Kamenskaya)
 */

goog.provide('brt.popup');

goog.require('brt.constants');
goog.require('brt.content.Templates.popup');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.json');
goog.require('goog.string');
goog.require('goog.ui.ToggleButton');



/**
 * Constructs a singleton popup instance.
 * Note that init() must be called on the instance
 * before it's usable.
 * @constructor
 * @export
 */
brt.popup = function() {
  /**
   * The last global coverage statistic.
   * @type {string}
   * @private
   */
  this.globalCoverageLast_ = '0';


  /**
   * The coverage statistics for the list of scripts found on the page.
   * @type {Array.<Object>}
   * @private
   */
  this.fileStats_ = [];


  /**
   * Extension's resources folder URL.
   * @type {string}
   * @private
   */
  this.resourcesFolder_ = chrome.extension.getURL('');
};
goog.addSingletonGetter(brt.popup);


/**
 * Initializes the popup instance.
 * @export
 */
brt.popup.prototype.init = function() {
  soy.renderElement(goog.dom.getDocument().body,
      brt.content.Templates.popup.waiting);
};


/**
 * Sets popup event listeners.
 * @private
 */
brt.popup.prototype.setPopupHandler_ = function() {
  var seeDetailsLink = goog.dom.getElement('seeDetails');
  if (seeDetailsLink) {
    goog.events.listen(seeDetailsLink, 'click',
        goog.bind(this.displayFileStats_, this));
  }

  var fullReportLink = goog.dom.getDocument().querySelector(
      'div.see-full-report');
  if (fullReportLink) {
    goog.events.listen(fullReportLink, 'click',
        goog.bind(this.displayFullReport_, this));
  }
};


/**
 * Displays coverage statistics for javascript internal and external scripts.
 * @private
 */
brt.popup.prototype.displayFileStats_ = function() {
  var seeDetailsLink = goog.dom.getElement('seeDetails');
  goog.style.showElement(seeDetailsLink, false);

  var fileStatsTitle = goog.dom.getElement('fileStatsTitle');
  soy.renderElement(fileStatsTitle,
      brt.content.Templates.popup.fileStatsTitle);

  var fileStats = goog.dom.getElement('fileStats');
  if (!fileStats) {
    return;
  }

  goog.dom.removeChildren(fileStats);
  for (var i = 0; i < this.fileStats_.length; i++) {
    var fileStatElem = soy.renderAsFragment(
        brt.content.Templates.popup.fileStats,
        {fileCoveragePercent: this.fileStats_[i].coveragePercent,
         fileName: this.getFileName_(i),
         fileExecutedCounter: this.fileStats_[i].executedCounter,
         fileCommandCounter: this.fileStats_[i].commandCounter});
    goog.dom.appendChild(fileStats, fileStatElem);

    this.changeFileCoveragePercentElemColor_(i);
    this.setCheckboxHandler_(i);
  }
};


/**
 * Displays full report with coverage statistics in a new browser tab.
 * @private
 */
brt.popup.prototype.displayFullReport_ = function() {
  chrome.tabs.getSelected(null, function(tab) {
      brt.coverageHelper.showCoverage(tab.id);
  });
};


/**
 * Returns file name for a given file index.
 * @param {number} fileIndex The index of file.
 * @return {string} The file name.
 * @private
 */
brt.popup.prototype.getFileName_ = function(fileIndex) {
  var fileName = this.fileStats_[fileIndex].fileName;
  // Make long file names shorter.
  if (fileName.length > 50) {
    fileName = goog.string.removeAt(fileName, 51,
        fileName.length - 50) + '...';
  }
  return fileName;
};


/**
 * Changes color of file coverage percent for a given file index.
 * Color is red, if coverage is under 50%, otherwise it's green.
 * @param {number} fileIndex The index of file.
 * @private
 */
brt.popup.prototype.changeFileCoveragePercentElemColor_ = function(fileIndex) {
  var fileCoveragePercentElem = goog.dom.getDocument().querySelectorAll(
      '#fileStats * div.file-coverage-percent')[fileIndex];
  if (this.fileStats_[fileIndex].coveragePercent > 50) {
    fileCoveragePercentElem.style.color = 'green';
  } else {
    fileCoveragePercentElem.style.color = 'red';
  }
};


/**
 * Sets event listener to checkboxes to track/untrack coverage for a given
 * file index.
 * @param {number} fileIndex The index of file.
 * @private
 */
brt.popup.prototype.setCheckboxHandler_ = function(fileIndex) {
  var optionTrack = goog.dom.getDocument().querySelectorAll(
      'input.option-track')[fileIndex];
  goog.events.listen(optionTrack, 'click', goog.bind(this.changeTracking_,
      this, fileIndex));
};


/**
 * Tracks or untracks coverage for a given file index.
 * @param {number} fileIndex The index of file.
 * @private
 */
brt.popup.prototype.changeTracking_ = function(fileIndex) {
  var statElem = goog.dom.getDocument().querySelectorAll(
      '#fileStats * span.file-command-counter-tracked')[fileIndex];
  var statLine = goog.dom.getDocument().querySelectorAll(
         '#fileStats div.stat-line')[fileIndex];
  if (!statElem || !statLine) {
    return;
  }

  var optionTrack = goog.dom.getDocument().querySelectorAll(
      'input.option-track')[fileIndex];
  var fileCoveragePercentElem = goog.dom.getDocument().querySelectorAll(
      '#fileStats * div.file-coverage-percent')[fileIndex];
  if (!optionTrack.checked) {
     this.fileStats_[fileIndex].tracked = false;
     statElem.innerHTML = '0';
     statLine.style.color = 'grey';
     fileCoveragePercentElem.style.color = 'grey';
  } else {
    this.fileStats_[fileIndex].tracked = true;
    statElem.innerHTML = this.fileStats_[fileIndex].commandCounter;
    statLine.style.color = 'black';
    this.changeFileCoveragePercentElemColor_(fileIndex);
  }
  this.getCurrentGlobalCoverage_();
};


/**
 * Gets and displays current global coverage which depends on tracked/untracked
 * scripts.
 * @private
 */
brt.popup.prototype.getCurrentGlobalCoverage_ = function() {
  var trackedExecutedCounter = 0;
  var trackedCommandCounter = 0;
  for (var i = 0; i < this.fileStats_.length; i++) {
    if (this.fileStats_[i].tracked) {
      trackedExecutedCounter += this.fileStats_[i].executedCounter;
      trackedCommandCounter += this.fileStats_[i].commandCounter;
    }
  }

  // Calculates current global coverage percent.
  var currentGlobalCoverage = ((trackedExecutedCounter * 100.0) /
      trackedCommandCounter).toFixed(1);
  currentGlobalCoverage = currentGlobalCoverage == 'NaN' ? '0' :
      currentGlobalCoverage;

  // Displays current global coverage percent.
  var currentGlobalCoverageElem = goog.dom.getDocument().querySelector(
      'span.global-coverage-current');
  goog.dom.setTextContent(currentGlobalCoverageElem,
      currentGlobalCoverage + '%');
};


/**
 * Updates coverage statistics in popup when they changed in background.
 * @param {string} globalCoveragePercent The global coverage percent.
 * @param {string} globalCoveragePercentLast The last global coverage percent.
 * @param {number} globalCommandCounter The global number of commands.
 * @param {Array} fileStats The coverage statistics for a script.
 */
brt.popup.prototype.updateCoverage = function(globalCoveragePercent,
    globalCoveragePercentLast, globalCommandCounter, fileStats) {
  var globalCoverageStatElem = goog.dom.getElement('globalCoverage');
  if (globalCoveragePercent != this.globalCoverageLast_) {
    this.globalCoverageLast_ = globalCoveragePercentLast;
    this.fileStats_ = fileStats;

    if (globalCoverageStatElem) {
      soy.renderElement(globalCoverageStatElem,
          brt.content.Templates.popup.header,
          {globalCoverageCurrent: globalCoveragePercent + '%',
           globalCoverageLast: this.globalCoverageLast_ + '%',
           globalCommandCounter: globalCommandCounter});
    } else {
      soy.renderElement(goog.dom.getDocument().body,
          brt.content.Templates.popup.all,
          {rootFolder: this.resourcesFolder_,
           globalCoverageCurrent: globalCoveragePercent + '%',
           globalCoverageLast: this.globalCoverageLast_ + '%',
           globalCommandCounter: globalCommandCounter});
    }
    this.setPopupHandler_();
    this.globalCoverageLast_ = globalCoveragePercent;
  }
};

