// // let _canRedirect = false;
// let _responseObj;
// let _formFillGuid;
// // let urlBase = 'https://leadhandlingapi.azurewebsites.net';
// if (isStaging()) {
//     // urlBase = 'https://leadhandlingapi-staging.azurewebsites.net';
// }
// let apiKey = 'a03844ea-97b2-4907-90f9-862106523f74'
const CONST_AUTO_QUALIFIED = 'AutoQualified';
const CONST_AUTO_REJECT = 'AutoReject';
const CONST_NEEDS_REVIEW = 'NeedsReview';
const LOADER_MARGIN_OFFSET = -20;
const LOADER_MESSAGE_WIDTH = 280;
const LOADER_MESSAGE_CONTAINER = document.getElementById("message-container");
const LOADER_DELAY_INCREASE = 1.25;
const LOADER_BOUNCE_AMOUNT = 25;
const LOADER_BOUNCE_DURATION_SECONDS = 0.15;
const LOADER_AFTER_BOUNCE_PAUSE = 0;
const TOTAL_SIZE_LIMIT_MB = 20;
let LOADER_CURRENT_MESSAGE_DELAY = 3000;
let LOADER_CURRENT_LEFT = -1140;
let hiddenElements = [];

var isMobile = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) < 400;
document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.remove("pendingFormSubmit");
    if (document.querySelector(".submitButton")?.length) {
        document.querySelector(".submitButton").removeAttribute('disabled');
    }

    let hiddenQuestionElements = document.querySelectorAll('input[type="hidden"][name^="AllQuestions"]');
    hiddenQuestionElements.forEach(function (e) {
        hiddenElements.push(
            {
                name: e.name,
                value: e.value
            }
        );
    });
    hiddenQuestionElements.forEach(e => e.remove());

    if (!isMobile) {
        var imgElements = [].slice.call(document.querySelectorAll("img"));
        imgElements.forEach(function (image) {
            var fullResUrl = image.src.replace("-lowres.", "-fullres.");
            var fullImage = new Image();
            fullImage.src = fullResUrl;
            fullImage.onload = function () {
                image.src = fullResUrl;
            };
        });
        var boxSectionElements = [].slice.call(document.querySelectorAll(".lowResImage"));
        boxSectionElements.forEach(function (image) {
            try {
                var fullResUrl = window.getComputedStyle(image)["background-image"].replace("-lowres.", "-fullres.").match(/url(([^)]+))/i)[1].trim().replace('("', '').replace('"', "");
                var fullResCSS = window.getComputedStyle(image)["background-image"].replace("-lowres.", "-fullres.");
                var fullImage = new Image();
                fullImage.src = fullResUrl;
                fullImage.onload = function () {
                    image.style.backgroundImage = fullResCSS;
                };
            }
            catch (error) { }
        });
    }
    const urlParams = new URLSearchParams(window.location.search);
    var phoneNumberParam = urlParams.get("PN");
    if (phoneNumberParam) {
        swapPhoneNumbers(phoneNumberParam);
    }

    var appendQueryButtons = document.querySelectorAll('.lp-element-button[data-append-query-params="true"]');
    appendQueryButtons.forEach(function (button) {
        try {
            var url = button.getAttribute("onclick").replace('window.open("', "").replace('")', "");
            var urlObj = new URL(url);
            var currentUrlObj = new URL(window.location);
            currentUrlObj.searchParams.forEach(function (value, param) {
                urlObj.searchParams.append(param, value);
            });

            button.setAttribute("onclick", `window.open("${urlObj.href}")`);
        } catch (error) { }
    });

    let firstNextButton = document.querySelector('.formNextBtn');
    if (firstNextButton) {
        firstNextButton.addEventListener("click", function (e) {
            sendFormStartEvent();
        });
    }
});

function swapPhoneNumbers(newPhoneNumber) {
    if (!newPhoneNumber) { return; }
    var phoneNumberDigits = newPhoneNumber.replace(/[^0-9]/g, "");
    if (phoneNumberDigits.length != 10) {
        return;
    }
    var phoneNumberFormatted = phoneNumberDigits.substring(0, 3) + "-" + phoneNumberDigits.substring(3, 6) + "-" + phoneNumberDigits.substring(6, 10);
    var phones = document.querySelectorAll("a[href^='tel']");
    for (var i = 0; i < phones.length; ++i) {
        if (phones[i].href != "tel:800-310-2222" && phones[i].href != "tel:800-859-9999") {
            phones[i].href = "tel:" + phoneNumberDigits;
            let displayDigitsOnly = phones[i].text?.replace(/\D/g, "");
            if (displayDigitsOnly.length == 10) {
                phones[i].text = phoneNumberFormatted;
            }
        }
    }
}

const form = document.getElementById("leadForm");
if (form) {
    form.onsubmit = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
}

function sendData() {
    const XHR = new XMLHttpRequest();
    XHR.withCredentials = true;

    XHR.addEventListener("error", function (event) {
        document.body.classList.remove("pendingFormSubmit");
        try {
            document.querySelector(".submitButton").removeAttribute('disabled');
        } catch (error) { }
        alert(
            "There was an unexpected error while sending your information. Please contact us at the number provided on the page."
        );
        return false;
    });

    XHR.addEventListener("load", function (event) {
        if (XHR.readyState === XHR.DONE) {
            if (XHR.status === 200) {
                _responseObj = JSON.parse(XHR.response);
                handleResponse();
            }
        }
    });
    // var submitEndpoint = `${urlBase}/api/Submit?apiKey=${apiKey}`;
    const FD = new FormData(form);
    let queryParams = new URLSearchParams(window.location.search);
    addCookiesToQueryParams(queryParams, ['_fbp', '_fbc', '_ga']);

    hiddenElements.forEach(function (e) {
        FD.append(e.name, e.value);
    });

    FD.append("QueryParameters", queryParams.toString());
    FD.append("LandingPageDomain", window.location.hostname);
    FD.append("LandingPagePath", window.location.pathname);
    FD.append("FullUrl", window.location.href);

    let optInCheckbox = document.getElementById('formDisclaimerCheckboxInput');
    if (optInCheckbox) {
        FD.append("OptInChecked", optInCheckbox.checked);
    }

    if (_formFillGuid) {
        FD.append("FormFillGuid", _formFillGuid);
    }

    let siteKey = getRecaptchaSiteKey();
    if (siteKey) {
        FD.append("RecaptchaSiteKey", siteKey);
    }

    XHR.open("POST", submitEndpoint);
    XHR.send(FD);
}

function addCookiesToQueryParams(queryParams, cookiesToAdd) {
    cookiesToAdd.forEach(function (name) {
        let value = getCookie(name);
        if (value) {
            queryParams.append(name, value);
        }
    });
}

function getCookie(cname) {
    try {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
    catch {
        return "";
    }
}

function handleResponse() {
    document.body.classList.remove("pendingFormSubmit");
    showGoogleFormAfterQuiz();
    // if (!_responseObj || !_canRedirect) {
    //     return;
    // }

    // if (isGtmLoaded() && _responseObj.requestId) {
    //     window.dataLayer.push({ event: "gtm.submissionId", submissionId: _responseObj.requestId });
    // }

    // if (isGtmLoaded()) {
    //     let formStatus = getFormStatus();
    //     if (formStatus == CONST_AUTO_QUALIFIED) {
    //         window.dataLayer.push({ event: "gtm.AutoQualified" });
    //     }
    //     else if (formStatus == CONST_AUTO_REJECT) {
    //         window.dataLayer.push({ event: "gtm.AutoReject" });
    //     }
    //     else if (formStatus == CONST_NEEDS_REVIEW) {
    //         window.dataLayer.push({ event: "gtm.NeedsReview" });
    //     }
    // }

    // document.body.classList.remove("pendingFormSubmit");

    // if (_responseObj.actionType == "smartForm" && _responseObj.message) {
    //     showGoogleFormAfterQuiz();
    // }
    // else {
    //     var url = document.getElementById("formAfterSubmitActionUrl")
    //         ? document.getElementById("formAfterSubmitActionUrl").value
    //         : "http://www.pintas.com";
    //     if (url) {
    //         document.location.href = url + window.location.search;
    //     }
    // }
}

function getRecaptchaSiteKey() {
    let siteKey = "";
    try {
        let url = new URL(document.querySelector('script[src*="recaptcha/api.js"]').src);
        let parsedSiteKey = url.searchParams.get('render');
        if (parsedSiteKey) {
            siteKey = parsedSiteKey;
        }
    }
    catch { }

    return siteKey;
}

function setRecaptchaKeyAndSubmit() {
    if (typeof grecaptcha != "object") {
        document.body.classList.remove("pendingFormSubmit");
        return false;
    }
    grecaptcha.ready(function () {
        try {
            let siteKey = getRecaptchaSiteKey();
            if (siteKey) {
                grecaptcha.execute(siteKey, { action: "submit" }).then(function (token) {
                    var recaptchaInput = document.getElementById("RecapchaResponse");
                    if (typeof recaptchaInput == "object") {
                        recaptchaInput.value = token;
                    }
                    sendData();
                });
            }
            else {
                sendData();
            }
        }
        catch {
            sendData();
        }
    });
}

// function isGtmLoaded() {
//     const gtmStartedEvent = window.dataLayer?.find((element) => element["gtm.start"]);
//     if (!gtmStartedEvent) {
//         return false;
//     } else if (!gtmStartedEvent["gtm.uniqueEventId"]) {
//         return false;
//     }
//     return true;
// }

function handleDataSend() {
    if (typeof grecaptcha == "object") {
        setRecaptchaKeyAndSubmit();
    } else {
        sendData();
    }
}

function redirectOrSetCanRedirect() {
    // _canRedirect = true;
    handleResponse();
}

const submitButton = document.querySelector(".submitButton");
if (submitButton) {
    submitButton.onclick = function (e) {
        var isSmartForm = document.getElementById("IsSmartForm")?.value == "True";
        if ((isSmartForm && !validateForm(document.querySelector(".currentPage"))) || (!isSmartForm && !validateForm())) {
            return false;
        }
        document.body.classList.add("pendingFormSubmit");
        if (document.getElementById('modal')) {
            setTimeout(() => {
                fireOffNextMessageAndWait();
            }, LOADER_CURRENT_MESSAGE_DELAY);
        }

        try {
            document.querySelector(".submitButton").setAttribute('disabled', true);
        } catch (error) { }

        handleDataSend();

    //     if (isGtmLoaded()) {
    //         window.dataLayer.push({ event: "gtm.submit", eventCallback: redirectOrSetCanRedirect });
    //     } else {
    //         redirectOrSetCanRedirect();
    //     }
     };
}

if (document.querySelectorAll("form").length >= 1 && !document.querySelector(".multiStepForm")) {
    if (submitButton) {
        submitButton.style.display = "initial";
    }
}

var phoneNumberInput = document.querySelectorAll("input[type=phone]")[0];
if (phoneNumberInput) {
    phoneNumberInput.addEventListener("keypress", function (e) {
        if (e.target.value.replace(/[^0-9]/g, "").length >= 13) {
            e.preventDefault();
        }
    });
    phoneNumberInput.addEventListener("blur", function (e) {
        formatPhoneNumber(e);
    });
    phoneNumberInput.addEventListener("focus", function (e) {
        clearPhoneNumberFormatting(e);
    });
}

function clearPhoneNumberFormatting(e) {
    var numbers = e.target.value.replace(/[^0-9]/g, "");
    e.target.value = numbers;
}

function formatPhoneNumber(e) {
    var numbers = e.target.value.replace(/[^0-9]/g, "");
    if (numbers.length > 10) {
        var x = numbers.slice(-10);
        var countryCode = numbers.slice(-13, -10);
        var formatted = "";
        if (countryCode) {
            formatted += "+" + countryCode + " ";
            formatted += "(" + x.substring(0, 3) + ") " + x.substring(3, 6) + "-" + x.substring(6, x.length);
            e.target.value = formatted;
        }
    }
    else {
        let nums = e.target.value.replace(/\D/g, "");
        groups = nums.replace(/[^0-9]/g, "").match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
        e.target.value = !groups[2] ? groups[1] : "(" + groups[1] + ") " + groups[2] + (groups[3] ? "-" + groups[3] : "");
    }
}

var extraInfoInput = document.querySelectorAll(".ExtraInfo")[0];
if (extraInfoInput) {
    extraInfoInput.addEventListener("input", function (e) {
        var length = extraInfoInput.value.length;
        var charDisplay = extraInfoInput.parentElement.querySelector(".charsRemainingDisplay");
        charDisplay.innerHTML = (500 - length) + "/500 characters";
    });
}

[...document.querySelectorAll('.fileInputClearButton')].forEach(function (elem) {
    elem.addEventListener("click", function () {
        let questionBox = elem.closest(".question-box");
        let fileInput = questionBox.querySelector('input[type="file"]');
        fileInput.value = '';
        elem.classList.add("hide");
        removeAlertElements(questionBox);
    });
});

[...document.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not(#formDisclaimerCheckboxInput), textarea')].forEach(function (elem) {
    elem.addEventListener("input", function () {
        removeAlertElements(elem);
    });
    elem.addEventListener("change", function () {
        removeAlertElements(elem);
    });
});

[...document.querySelectorAll('input[type="radio"]:not([type="hidden"])')].forEach(function (elem) {
    elem.addEventListener("change", function () {
        elem.closest(".question-box").classList.remove("invalidFormRadioInput");
        removeAlertElements(elem);
    });
});

[...document.querySelectorAll('input[type="checkbox"]:not([type="hidden"]):not(#formDisclaimerCheckboxInput)')].forEach(function (elem) {
    elem.addEventListener("change", function () {
        elem.closest(".question-box").classList.remove("invalidFormRadioInput");
        removeAlertElements(elem);
    });
});

[...document.querySelectorAll('input[type="file"]:not([type="hidden"])')].forEach(function (elem) {
    elem.addEventListener("change", function () {
        let questionBox = elem.closest(".question-box");
        if (totalFilesSize(elem) > 0) {
            questionBox.querySelector('.fileInputClearButton')?.classList.remove("hide");
        }
        else {
            questionBox.querySelector('.fileInputClearButton')?.classList.add("hide");
        }
        removeAlertElements(elem);
    });
});

[...document.querySelectorAll('select:not([type="hidden"])')].forEach(function (elem) {
    elem.addEventListener("change", function () {
        removeAlertElements(elem);
    });
});

function removeAlertElements(element) {
    var alertElements = element.closest(".question-box").querySelectorAll(".validate-popup");
    while (alertElements.length > 0) {
        alertElements[0].parentNode.removeChild(alertElements[0]);
        alertElements = element.closest(".question-box").querySelectorAll(".validate-popup");
    }
    element.classList.remove('invalidFormRadioInput');
}

function scrollToElement(element) {
    try {
        document.getElementsByTagName('html')[0].style.scrollBehavior = 'smooth';
        var headerheight = 0;
        var headerElement = document.querySelector(".block-header-element-published.blockOverlay");
        if (headerElement) {
            headerheight = headerElement.getBoundingClientRect().height;
        }
        var yPosition = (top = getElementTopOffset(element) - headerheight - 10);
        window.scrollTo(0, yPosition);
    }
    catch {
        element.scrollIntoView();
    }
}

function insertErrorPopUpAndFocusInput(questionBox, inputElement = null, message = "Required", offset = 5) {
    var errorPopup = questionBox.querySelector(".validate-popup");
    if (!errorPopup) {
        errorPopup = document.createElement("DIV");
        errorPopup.classList.add("validate-popup");
        errorPopup.innerHTML = message;
        errorPopup.style.bottom = (questionBox.clientHeight + offset) + "px";
        errorPopup.style.textWrap = 'balance';
        errorPopup.addEventListener("click", function () {
            this.remove();
        });
        questionBox.prepend(errorPopup);
    }
    if (isMobile) {
        scrollToElement(errorPopup);
    }
    if (inputElement) {
        inputElement.focus();
    }
    setFormZIndex();
}

function setFormZIndex() {
    var formElement = document.querySelector(".lp-element-form");
    if (formElement) {
        formElement.style.zIndex = 10000;
    }
}

function getElementTopOffset(el) {
    var rect = el.getBoundingClientRect(),
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
}

function validateForm(elementToValidate = document) {
    var emailRegex = new RegExp(/^([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|\[[\t -Z^-~]*])$/);
    document.querySelectorAll(".questionRow").forEach(x => x.style.overflow = "inherit");
    document.querySelectorAll(".question-box").forEach(x => x.style.position = "relative");
    var qbs = [...elementToValidate.querySelectorAll(".question-box")].filter(x => x.style.display != "none");
    for (var i = 0; i < qbs.length; i++) {
        var phoneInput = qbs[i].querySelector("input[type=phone]");
        if (phoneInput && !(phoneInput.value.replace(/\D/g, "").length >= 10)) {
            phoneInput.classList.add("invalidFormTextInput");
            insertErrorPopUpAndFocusInput(qbs[i], phoneInput, "Please enter a valid phone number");
            return false;
        }
        var emailInput = qbs[i].querySelector("input[type=email]");
        if (emailInput && !emailRegex.test(emailInput.value)) {
            emailInput.classList.add("invalidFormTextInput");
            insertErrorPopUpAndFocusInput(qbs[i], emailInput, "Please enter a valid input");
            return false;
        }
        var selectInput = qbs[i].querySelector("select");
        if (selectInput && selectInput.hasAttribute("required") && !selectInput.value) {
            selectInput.classList.add("invalidFormTextInput");
            insertErrorPopUpAndFocusInput(qbs[i], selectInput, "Please select an option");
            return false;
        }
        var textareaInput = qbs[i].querySelector("textarea");
        if (textareaInput && textareaInput.hasAttribute("required") && !textareaInput.value) {
            textareaInput.classList.add("invalidFormTextInput");
            insertErrorPopUpAndFocusInput(qbs[i], selectInput, "Please answer this question");
            return false;
        }
        var textInput = qbs[i].querySelector(".formTextInput[type=text], .formDateInput[type=date]");
        if (textInput && textInput.hasAttribute("required") && !textInput.value) {
            textInput.classList.add("invalidFormTextInput");
            insertErrorPopUpAndFocusInput(qbs[i], textInput, "Please answer this question");
            return false;
        }
        var fileInput = qbs[i].querySelector("input[type=file]");
        if (fileInput && fileInput.hasAttribute("required") && !fileInput.files.length) {
            qbs[i].classList.add("invalidFormRadioInput");
            insertErrorPopUpAndFocusInput(qbs[i], fileInput, "Please answer this question");
            return false;
        }
        if (fileInput && totalFilesSize(fileInput) > TOTAL_SIZE_LIMIT_MB) {
            qbs[i].classList.add("invalidFormRadioInput");
            insertErrorPopUpAndFocusInput(qbs[i], fileInput, `${TOTAL_SIZE_LIMIT_MB}mb total size limit for files`);
            return false;
        }
        if (fileInput && !areAllFileExtensionsAllowed(fileInput)) {
            qbs[i].classList.add("invalidFormRadioInput");
            insertErrorPopUpAndFocusInput(qbs[i], fileInput, `Invalid file type(s). Only PDFs and images are allowed ex. .jpg, .jpeg, .png`);
            return false;
        }
        if (qbs[i].querySelector("input[type=radio]") && !qbs[i].querySelector("input[type=radio]:valid")) {
            qbs[i].classList.add("invalidFormRadioInput");
            insertErrorPopUpAndFocusInput(qbs[i], null, "Please select an option");
            return false;
        }
        if (qbs[i].classList.contains("required") && qbs[i].querySelector("input[type=checkbox]") && !qbs[i].querySelector("input[type=checkbox]:checked")) {
            qbs[i].classList.add("invalidFormRadioInput");
            insertErrorPopUpAndFocusInput(qbs[i], null, "Please select an option");
            return false;
        }

        let optInCheckbox = document.getElementById('formDisclaimerCheckboxInput');
        if (optInCheckbox && optInCheckbox?.hasAttribute('required') && !optInCheckbox?.checked) {
            insertErrorPopUpAndFocusInput(document.getElementById('tcpaDisclaimer'), undefined, undefined, 10);
            return false;
        }
    }
    return true;
}

function totalFilesSize(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
        return 0;
    }

    let totalBytes = Array.from(fileInput.files).reduce((a, f) => a + f.size, 0);
    let totalMb = totalBytes / (1024 * 1024);

    return totalMb;
}

function areAllFileExtensionsAllowed(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
        return true;
    }
    let specificAllowedExtensions = ['pdf'];
    let invalidFiles = Array.from(fileInput.files)
        .filter(x => !x.type.includes('image/') && !specificAllowedExtensions.some(t => x.type.includes(t)));

    if (invalidFiles.length > 0) {
        return false;
    }

    return true;
}

function sendPageVisitEvent() {
    try {
        fetch(`${urlBase}/api/PageVisit?apiKey=${apiKey}`, {
            method: 'POST'
        });
    }
    catch { }
}

function sendFormStartEvent() {
    try {
        let bodyData = {
            LogType: 'FormFillStart',
            Domain: location.hostname,
            Path: location.pathname,
            QueryParams: location.search,
            LeadUniqueId: _formFillGuid
        };

        fetch(`${urlBase}/api/AddFormFillStartLog?apiKey=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify(bodyData),
            headers: {
                'Accept': 'application/json, text/plain',
                'Content-Type': 'application/json;charset=UTF-8'
            }
        })
            .then(response => response.json())
            .then(response => _formFillGuid = response.formFillGuid);
    }
    catch { }
}

function getFormStatus() {
    let hasAutoReject = false;
    let hasNeedsReview = false;

    document.querySelectorAll('.question-box').forEach(function (question) {
        //dropdowns
        if (question.querySelector('option[isdisqualifying="True"]:checked')) {
            hasAutoReject = true;
        }
        if (question.querySelector('option[isneedscontact="True"]:checked')) {
            hasNeedsReview = true;
        }

        //radio
        if (question.querySelector('input[type="radio"][isdisqualifying="True"]:checked')) {
            hasAutoReject = true;
        }
        if (question.querySelector('input[type="radio"][isneedscontact="True"]:checked')) {
            hasNeedsReview = true;
        }

        //checkboxes
        if (question.querySelector('input[type="checkbox"][isdisqualifying="True"]:checked')) {
            hasAutoReject = true;
        }
        if (question.querySelector('input[type="checkbox"][isneedscontact="True"]:checked') &&
            !question.querySelectorAll('input[type="checkbox"][isdisqualifying="False"][isneedscontact="False"]:checked').length) {
            hasNeedsReview = true;
        }
    });

    if (hasAutoReject) {
        return CONST_AUTO_REJECT;
    }

    if (hasNeedsReview) {
        return CONST_NEEDS_REVIEW;
    }

    var isSmartForm = document.getElementById("IsSmartForm")?.value == "True";
    if (isSmartForm) {
        return CONST_AUTO_QUALIFIED;
    }

    return '';
}

function isStaging() {
    if (typeof location != "undefined") {
        return location.pathname?.includes('/LandingPageStaging') || location.pathname?.includes('/LayoutImplementation/Preview');
    }

    return false;
}

function handlePostBounceUpdate() {
    LOADER_CURRENT_LEFT += LOADER_BOUNCE_AMOUNT;
    LOADER_CURRENT_LEFT += LOADER_MESSAGE_WIDTH;

    LOADER_CURRENT_MESSAGE_DELAY = Math.ceil(
        LOADER_CURRENT_MESSAGE_DELAY * LOADER_DELAY_INCREASE
    );

    LOADER_MESSAGE_CONTAINER.style.transition = "left .4s ease";
    LOADER_MESSAGE_CONTAINER.style.left = LOADER_CURRENT_LEFT + "px";

    setTimeout(() => {
        fireOffNextMessageAndWait();
    }, LOADER_CURRENT_MESSAGE_DELAY);
}

function fireOffNextMessageAndWait() {
    if (LOADER_CURRENT_LEFT >= LOADER_MARGIN_OFFSET) {
        return;
    }

    LOADER_MESSAGE_CONTAINER.style.transition = "left " + LOADER_BOUNCE_DURATION_SECONDS + "s ease";
    LOADER_CURRENT_LEFT -= LOADER_BOUNCE_AMOUNT;
    LOADER_MESSAGE_CONTAINER.style.left = LOADER_CURRENT_LEFT + "px";

    setTimeout(() => {
        handlePostBounceUpdate();
    }, LOADER_BOUNCE_DURATION_SECONDS * 1000 + LOADER_AFTER_BOUNCE_PAUSE);
}

function handleOptInCheckboxClick(e) {
    document.querySelector('#tcpaDisclaimer .validate-popup')?.remove();
}

function handleDeferredScripts() {
    if (typeof _scripts === "undefined" || !Array.isArray(_scripts) || _scripts.length === 0) {
        return;
    }

    let _scriptsHaveExecuted = false;
    let _documentIsReady = false;
    const _eventsToTriggerExecute = ["mousemove", "mousedown", "keydown", "scroll"];

    function cleanUp() {
        _eventsToTriggerExecute.forEach((eventType) => {
            window.removeEventListener(eventType, execute);
        });
    }

    function scriptsToRun() {
        if (_scriptsHaveExecuted) {
            return;
        }

        _scriptsHaveExecuted = true;
        cleanUp();

        const head = document.getElementsByTagName("head")[0];
        _scripts.forEach((scriptObj) => {
            if (scriptObj) {
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.async = scriptObj.async;
                if (typeof scriptObj.js === "string" && scriptObj.src.length > 0) {
                    script.src = scriptObj.src;
                }
                script.appendChild(document.createTextNode(scriptObj.js));
                head.appendChild(script);
            }
        });
    }

    function execute() {
        if (_documentIsReady) {
            scriptsToRun();
        }
    }
    _eventsToTriggerExecute.forEach((eventType) => {
        window.addEventListener(eventType, execute);
    });

    function handleDocumentReady() {
        _documentIsReady = true;
        window.removeEventListener("load", handleDocumentReady);
    }

    function windowLoaded() {
        if (document.readyState === "complete") {
            handleDocumentReady();
        } else {
            window.addEventListener("load", handleDocumentReady);
        }
    }
    windowLoaded();
}
// Disable old form submission completely
document.addEventListener("DOMContentLoaded", function () {
    var quizForm = document.getElementById('leadForm');
    if (quizForm) {
        quizForm.onsubmit = function() { return false; };
    }
    var submitBtn = document.querySelector('.submitButton');
    if (submitBtn) {
        submitBtn.onclick = function(e) { e.preventDefault(); return false; };
    }
});
function showGoogleFormAfterQuiz() {
    // Hide the quiz form
    var quizForm = document.getElementById('leadForm');
    if (quizForm) quizForm.style.display = 'none';
    // Hide the submit button if it's outside the form
    var submitBtn = document.querySelector('.submitButton');
    if (submitBtn) submitBtn.style.display = 'none';
    // Show the Google Form
    var googleForm = document.getElementById('googleFormContainer');
    if (googleForm) googleForm.style.display = 'block';
}
handleDeferredScripts();
sendPageVisitEvent();
