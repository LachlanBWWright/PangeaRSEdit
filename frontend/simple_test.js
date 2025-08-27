"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple manual test to debug Otto browser loading
 */
var playwright_1 = require("playwright");
function testOttoLoading() {
    return __awaiter(this, void 0, void 0, function () {
        var browser, page, ottoButton, errors, modelContent, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting manual browser test...');
                    return [4 /*yield*/, playwright_1.chromium.launch({ headless: true })];
                case 1:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newPage()];
                case 2:
                    page = _a.sent();
                    // Listen for console messages and errors
                    page.on('console', function (msg) { return console.log('BROWSER:', msg.text()); });
                    page.on('pageerror', function (error) { return console.error('PAGE ERROR:', error.message); });
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 13, 15, 17]);
                    return [4 /*yield*/, page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer')];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, page.waitForLoadState('networkidle')];
                case 5:
                    _a.sent();
                    console.log('Page loaded successfully');
                    // Take a screenshot first
                    return [4 /*yield*/, page.screenshot({ path: '/tmp/before_otto_load.png' })];
                case 6:
                    // Take a screenshot first
                    _a.sent();
                    console.log('Screenshot saved: /tmp/before_otto_load.png');
                    // Click the "Load Otto with Skeleton Data" button
                    console.log('Looking for Otto button...');
                    ottoButton = page.locator('button:has-text("Load Otto with Skeleton Data")');
                    return [4 /*yield*/, ottoButton.waitFor({ timeout: 10000 })];
                case 7:
                    _a.sent();
                    console.log('Found Otto button, clicking...');
                    return [4 /*yield*/, ottoButton.click()];
                case 8:
                    _a.sent();
                    // Wait a bit and see what happens
                    return [4 /*yield*/, page.waitForTimeout(5000)];
                case 9:
                    // Wait a bit and see what happens
                    _a.sent();
                    // Take another screenshot
                    return [4 /*yield*/, page.screenshot({ path: '/tmp/after_otto_load.png' })];
                case 10:
                    // Take another screenshot
                    _a.sent();
                    console.log('Screenshot saved: /tmp/after_otto_load.png');
                    return [4 /*yield*/, page.evaluate(function () {
                            var errorElements = document.querySelectorAll('[data-error], .error, .text-red-500');
                            return Array.from(errorElements).map(function (el) { return el.textContent; });
                        })];
                case 11:
                    errors = _a.sent();
                    if (errors.length > 0) {
                        console.log('Found errors on page:', errors);
                    }
                    else {
                        console.log('No visible errors found');
                    }
                    return [4 /*yield*/, page.evaluate(function () {
                            var canvas = document.querySelector('canvas');
                            return canvas ? 'Canvas found' : 'No canvas found';
                        })];
                case 12:
                    modelContent = _a.sent();
                    console.log('Model content:', modelContent);
                    return [3 /*break*/, 17];
                case 13:
                    error_1 = _a.sent();
                    console.error('Test failed:', error_1.message);
                    return [4 /*yield*/, page.screenshot({ path: '/tmp/error.png' })];
                case 14:
                    _a.sent();
                    return [3 /*break*/, 17];
                case 15: return [4 /*yield*/, browser.close()];
                case 16:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 17: return [2 /*return*/];
            }
        });
    });
}
testOttoLoading().catch(console.error);
