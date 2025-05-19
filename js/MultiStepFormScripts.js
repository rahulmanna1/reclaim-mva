const FADE_OUT_LENGTH = 600;
const FADE_IN_DELAY = 400;
const FADE_IN_LENGTH = 150;
const FADE_OUT_TRANSITION = `transform ease-in-out ${FADE_OUT_LENGTH / 1000.0}s, opacity ease-in-out ${FADE_OUT_LENGTH / 1000.0}s, right ease-in-out ${FADE_IN_LENGTH / 1000.0}s`;
const FADE_IN_TRANSITION = `transform ease-in-out ${FADE_IN_LENGTH / 1000.0}s, opacity ease-in-out ${FADE_IN_LENGTH / 1000.0}s, right ease-in-out ${FADE_IN_LENGTH / 1000.0}s`;

if (document.querySelector('.multiStepForm') && (document.querySelectorAll('.questionRow').length == 1)) {
    if (submitButton) {
        submitButton.style.display = "initial";
    }
    document.querySelectorAll(".formStepControls").forEach(x => x.style.display = "none");
}

function showPostSubmitContainer(message) {
    document.getElementById("leadForm").style.display = "none";
    let container = document.getElementById('postSubmitContainer');
    container.style.display = "";
    container.innerHTML = message;
    scrollToElement(container);
}

function updateProgress(currentPage, override = null) {
    let percentageDone = override ?? Math.round(((previousPageIds.length + 1) / ((previousPageIds.length + 1) + maxNumberOfPagesLeft(currentPage, 0))) * 100);
    let progressBar = document.getElementById('formProgressBar');
    progressBar.style.width = percentageDone + "%";
    progressBar.style.transition = 'width 0.4s ease-in-out';
    document.getElementById('formProgressPercent').innerHTML = percentageDone + "%";
}

function maxNumberOfPagesLeft(page, count) {
    if ([...document.querySelectorAll('.questionRow')].pop().id == page.id) {
        return count;
    }

    let pageIds = possibleNextPages(page);
    let maxPagesLeft = pageIds.map(pageId => maxNumberOfPagesLeft(document.getElementById(pageId), count + 1));
    return Math.max(...maxPagesLeft);
}

function possibleNextPages(page) {
    let pageIds = [...page.querySelectorAll('[isskipanswer="True"]')].map(x => x.getAttribute('pageidtoskipto'));
    pageIds = pageIds.concat([...page.querySelectorAll('[isqualifyingskipquestion="True"]')].map(x => x.getAttribute('qualifyingnextpageid')));
    pageIds = pageIds.concat([...page.querySelectorAll('[isdisqualifyingskipquestion="True"]')].map(x => x.getAttribute('disqualifyingnextpageid')));

    if (page.getAttribute('defaultnextpageid')) {
        pageIds.push(page.getAttribute('defaultnextpageid'));
    }
    else if (((!page.querySelector('select') && !page.querySelector('input[type="radio"]') && !page.querySelector('input[type="checkbox"]')) ||
        page.querySelector('[isskipanswer="False"]:not([disabled])') ||
        page.querySelector('[isqualifyingskipquestion="False"]') ||
        page.querySelector('[isdisqualifyingskipquestion="False"]')) &&
        page.nextElementSibling.classList.contains('questionRow')
    ) {
        pageIds.push(page.nextElementSibling.id);
    }

    var validPages = pageIds.filter(elements => {
        return elements !== null && elements !== "";
    });

    if (!validPages.length) {
        validPages.push(page.nextElementSibling.id);
    }

    return [...new Set(validPages)]
}

var nextFormPageBtns = document.querySelectorAll(".formNextBtn");
if (nextFormPageBtns) {
    nextFormPageBtns.forEach(nextFormPageBtn => {
        nextFormPageBtn.addEventListener("click", function (event) {
            if (validateForm(document.querySelector('.questionRow.currentPage'))) {
                handleNextClick(event);
            }
        });
    });
}

var prevFormPageBtn = document.getElementById("previousButton");
if (prevFormPageBtn) {
    prevFormPageBtn.addEventListener("click", function (event) {
        handlePreviousClick(event);
    });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////// new

var previousPageIds = [];
showAllNextValidQuestions(document.querySelector('.question-box'));
updateProgress(document.querySelector('.currentPage'), 2);
//document.getElementById('formProgressBar').style.transition = 'width 0.4s ease-in-out';

var answerElement;
//checkboxes
[...document.querySelectorAll('input[type="checkbox"]:not([type="hidden"]):not(#formDisclaimerCheckboxInput)')].forEach(function (elem) {
    elem.addEventListener('input', function () {
        handleAnswerChange(elem);
    });
});

//dropdowns
[...document.querySelectorAll('select:not([type="hidden"])')].forEach(function (elem) {
    elem.addEventListener('change', function () {
        var option = elem.querySelector(`option:checked`);
        handleAnswerChange(option);
    });
});

//radio
[...document.querySelectorAll('input[type="radio"]:not([type="hidden"])')].forEach(function (elem) {
    elem.addEventListener('input', function () {
        handleAnswerChange(elem);
    });
});

document.addEventListener('click', function (event) {
    if (event.target.id == 'signupNowBtn') {
        if (isGtmLoaded()) {
            window.dataLayer.push({ event: "gtm.ClickedSignUpNow" });
        }
    }
});

function handleAnswerChange(element) {
    //check if answer is skip, if so hide and clear all following questions/answers on page(in case someone changes their answer), do nothing else
    //if not, show next question if it exists, also show all immediately following questions that are textbox/ textarea types

    answerElement = element;

    var isSkipAnswer = element.getAttribute('isskipanswer') == 'True' ||
        element.getAttribute('isqualifyingskipquestion') == 'True' ||
        element.getAttribute('isdisqualifyingskipquestion') == 'True';
    if (isSkipAnswer) {
        //hide all following questions
        var currQuestion = answerElement.closest('.question-box');
        while (currQuestion.nextElementSibling && currQuestion.nextElementSibling.classList.contains('question-box')) {
            currQuestion = currQuestion.nextElementSibling;
            currQuestion.style.display = 'none';
            currQuestion.querySelectorAll('select, .formTextInput, textarea').forEach(x => x.value = '');
            currQuestion.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(x => x.checked = false);
        }

    }
    else {
        //show all textboxes and textareas immediately after, and then first other type question
        var currQuestion = answerElement.closest('.question-box');
        while (currQuestion.nextElementSibling && currQuestion.nextElementSibling.classList.contains('question-box')) {
            currQuestion = currQuestion.nextElementSibling;
            currQuestion.style.display = '';

            if (currQuestion.querySelectorAll('input[type="radio"]').length > 0 ||
                currQuestion.querySelectorAll('input[type="checkbox"]').length > 0 ||
                currQuestion.querySelectorAll('select').length > 0) {
                break;
            }
        }
    }
}

function handleNextClick(e) {
    var nextPageId;
    var questionsVisibleOnPage = [...document.querySelector('.currentPage').querySelectorAll('.question-box')].filter(x => x.style.display != 'none');
    for (var i = questionsVisibleOnPage.length - 1; i >= 0; i--) {
        var question = questionsVisibleOnPage[i];
        if (question.querySelector('select')) {
            var select = question.querySelector('select');
            var selectedAnswerPageId = select.options[select.selectedIndex].getAttribute('pageidtoskipto');
            if (selectedAnswerPageId) {
                nextPageId = selectedAnswerPageId;
                break;
            }
        }
        else if (question.querySelector('input[type="radio"]')) {
            var selectedAnswerPageId = question.querySelector('input[type="radio"]:checked').getAttribute('pageidtoskipto');
            if (selectedAnswerPageId) {
                nextPageId = selectedAnswerPageId;
                break;
            }
        }
        else if (question.querySelector('input[type="checkbox"]')) {
            var disqualifyingCheckboxes = question.querySelectorAll('input[type="checkbox"][isdisqualifying="True"]:checked');
            var qualifyingCheckboxes = question.querySelectorAll('input[type="checkbox"][isdisqualifying="False"][isneedscontact="False"]:checked')
            var needsReviewCheckboxes = question.querySelectorAll('input[type="checkbox"][isdisqualifying="False"][isneedscontact="True"]:checked')
            if (qualifyingCheckboxes.length > 0) {
                nextPageId = question.getAttribute('qualifyingnextpageid');
            }
            else if (needsReviewCheckboxes.length > 0) {
                nextPageId = document.querySelector('.currentPage').getAttribute('defaultnextpageid');
            }
            else if (disqualifyingCheckboxes.length > 0) {
                nextPageId = question.getAttribute('disqualifyingnextpageid');
            }
        }
    }

    if (!nextPageId) {
        let defaultNextPageId = document.querySelector('.currentPage').getAttribute('defaultnextpageid');
        nextPageId = defaultNextPageId;
    }

    if (!nextPageId) {
        nextPageId = document.querySelector('.currentPage').nextElementSibling.id;
    }

    var currentPageId = document.querySelector('.questionRow.currentPage').id;
    previousPageIds.push(currentPageId);

    document.querySelector('#previousButtonWrapper').classList.remove('disable');
    var nextPage = document.getElementById(nextPageId);
    handlePageShow(nextPage);
    transitionToNextPage(document.getElementById(currentPageId), nextPage);
}

function handlePreviousClick(e) {
    var previousPageId = previousPageIds.pop();
    var currentPage = document.querySelector('.currentPage');

    document.querySelectorAll(".formStepControls").forEach(x => x.style.display = "");
    var previousPage = document.getElementById(previousPageId);
    if (previousPage) {
        handlePageShow(previousPage);
        transitionToPreviousPage(previousPage, currentPage);
    }
}

function handlePageShow(pageElement) {
    var firstQuestion = pageElement.querySelector('.question-box');
    showAllNextValidQuestions(firstQuestion);

    var nextpage = pageElement.nextElementSibling;
    if (!nextpage || !nextpage.classList.contains('questionRow')) {
        document.querySelectorAll(".formStepControls").forEach(x => x.style.display = "none");

        if (isUserQualified() && document.getElementById('docusignTemplateId')?.value.length > 0) {
            document.getElementById('submitPageQualifiedMessage').style.display = null;
            document.getElementById('submitPageNotQualifiedMessage').style.display = 'none';
        }
        else {
            document.getElementById('submitPageNotQualifiedMessage').style.display = null;
            document.getElementById('submitPageQualifiedMessage').style.display = 'none';
        }
    }
}

function transitionToNextPage(currentPage, nextPage) {
    toggleNavigationEnabled(false);
    removeErrorMessagesOnPage(currentPage);
    var pageWidth = currentPage.getBoundingClientRect().width;
    document.querySelectorAll('.questionRow').forEach(x => x.style.width = pageWidth + 'px');
    document.querySelectorAll(".formStepControls").forEach(x => x.classList.add('disbled'));

    let formWrapper = document.getElementById('formRowOnlyWrapper');
    formWrapper.style.height = formWrapper.getBoundingClientRect().height;

    currentPage.style.transition = FADE_OUT_TRANSITION;
    currentPage.style.position = 'absolute';
    currentPage.style.opacity = 0;
    currentPage.style.transform = 'translateX(-100%)';

    nextPage.classList.add('toggleBlockImportant');
    nextPage.style.right = '-100%';
    nextPage.style.opacity = 0;

    formWrapper.classList.add('transition');
    formWrapper.style.height = Math.max(currentPage.getBoundingClientRect().height, nextPage.getBoundingClientRect().height) + 'px';

    setTimeout(function () {
        document.querySelectorAll(".formStepControls").forEach(x => x.classList.remove('disbled'));
        currentPage.classList.remove('toggleBlockImportant');
        resetTransitionStyles(currentPage);
    }, FADE_OUT_LENGTH);

    nextPage.style.transition = FADE_IN_TRANSITION;

    setTimeout(function () {
        nextPage.style.opacity = 1;
        nextPage.style.transform = 'translateX(-100%)';


        setTimeout(function () {
            formWrapper.style.height = (nextPage.getBoundingClientRect().height + 1) + 'px';
            setTimeout(function () {
                formWrapper.classList.remove('transition');
                formWrapper.style.height = null;
                toggleNavigationEnabled(true);
            }, 500);
            nextPage.classList.add('currentPage');
            currentPage.classList.remove('currentPage');
            document.querySelectorAll('.questionRow').forEach(x => x.style.width = null);
            togglePreviousButton();
            resetTransitionStyles(nextPage);
            updateProgress(nextPage);
            scrollFormIntoViewIfNecessary();

        }, FADE_IN_LENGTH);
    }, FADE_IN_DELAY);
}

function transitionToPreviousPage(previousPage, currentPage) {
    toggleNavigationEnabled(false);
    removeErrorMessagesOnPage(currentPage);
    document.querySelectorAll(".formStepControls").forEach(x => x.classList.add('disbled'));

    let formWrapper = document.getElementById('formRowOnlyWrapper');
    formWrapper.style.height = formWrapper.getBoundingClientRect().height;

    currentPage.style.transition = FADE_OUT_TRANSITION;
    currentPage.style.opacity = 0;
    currentPage.style.top = currentPage.offsetTop + 'px';
    currentPage.style.position = 'absolute';
    currentPage.style.transform = 'translateX(100%)';

    previousPage.classList.add('toggleBlockImportant');
    previousPage.style.opacity = 0;


    formWrapper.classList.add('transition');
    formWrapper.style.height = Math.max(currentPage.getBoundingClientRect().height, previousPage.getBoundingClientRect().height) + 'px';

    setTimeout(function () {
        currentPage.classList.remove('toggleBlockImportant');
        document.querySelectorAll(".formStepControls").forEach(x => x.classList.remove('disbled'));
        resetTransitionStyles(currentPage);
        clearInputs(currentPage);
    }, FADE_OUT_LENGTH);

    previousPage.style.transform = 'translateX(-100%)';
    previousPage.style.transition = FADE_IN_TRANSITION;

    setTimeout(function () {
        previousPage.style.opacity = 1;
        previousPage.style.transform = 'translateX(0%)';

        setTimeout(function () {
            formWrapper.style.height = (previousPage.getBoundingClientRect().height + 1) + 'px';
            setTimeout(function () {
                formWrapper.classList.remove('transition');
                formWrapper.style.height = null;
                toggleNavigationEnabled(true);
            }, 500);
            previousPage.classList.add('currentPage');
            currentPage.classList.remove('currentPage');
            document.getElementById('leadForm').style.height = null;
            resetTransitionStyles(previousPage);
            updateProgress(previousPage);
            scrollFormIntoViewIfNecessary();
        }, FADE_IN_LENGTH);

    }, FADE_IN_DELAY);
    togglePreviousButton(previousPage);
}

function scrollFormIntoViewIfNecessary() {
    if (!isInViewport(document.getElementById("formTopContentWrapper"))) {
        var headerheight = 0;
        var headerElement = document.querySelector(".block-header-element-published.blockOverlay");
        if (headerElement) {
            headerheight = headerElement.getBoundingClientRect().height;
        }
        var yPosition = (errorPopUpTop = getElementTopOffset(document.querySelector('.form-section')) - headerheight - 10);
        window.scrollTo(0, yPosition);
    }
}

function togglePreviousButton(newPage) {
    try {
        if (newPage && newPage.id == document.querySelector('.questionRow').id) {
            document.querySelector('#previousButtonWrapper').style.visibility = "hidden";
        }
        else {
            document.querySelector('#previousButtonWrapper').style.visibility = "";
        }
    }
    catch {
        document.querySelector('#previousButtonWrapper').style.visibility = "";
    }

}

function toggleNavigationEnabled(enable) {
    if (enable) {
        document.querySelectorAll('.formNextBtn').forEach(btn => btn.classList.remove('disableClick'));
    }
    else {
        document.querySelectorAll('.formNextBtn').forEach(btn => btn.classList.add('disableClick'));
    }

    if (!enable || document.querySelectorAll('.questionRow')[0].classList.contains('currentPage')) {
        document.querySelector('#previousButtonWrapper').classList.add('disable');
    }
    else {
        document.querySelector('#previousButtonWrapper').classList.remove('disable');
    }
}

function removeErrorMessagesOnPage(page) {
    page.querySelectorAll('.validate-popup').forEach(popup => popup.remove());
    page.querySelectorAll('.question-box').forEach(function (questionBox) {
        questionBox.classList.remove('invalidFormRadioInput');
        questionBox.querySelectorAll('.invalidFormTextInput').forEach(element => element.classList.remove('invalidFormTextInput'));
    });
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function resetTransitionStyles(page) {
    page.style.transition = null;
    page.style.position = null;
    page.style.transform = null;
    page.style.left = null;
    page.style.top = null;
    page.style.right = null;
}

function showAllNextValidQuestions(question) {
    if (!question) { return; }
    question.style.display = '';

    while (question.nextElementSibling && question.nextElementSibling.classList.contains('question-box')) {
        if (question.querySelectorAll('*[type="radio"][isskipanswer="True"]').length > 0 ||
            question.querySelectorAll('select option[isskipanswer="True"]').length > 0 ||
            question.getAttribute('isqualifyingskipquestion') == 'True' ||
            question.getAttribute('isdisqualifyingskipquestion') == 'True') {
            break;
        }
        else {
            question = question.nextElementSibling;
            question.style.display = '';
        }
    }
}

function clearInputs(element = document) {
    element.querySelectorAll('.question-box').forEach(function (e) {
        e.style.display = 'none';
        e.querySelectorAll('select, .formTextInput, textarea').forEach(x => x.value = '');
        e.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(x => x.checked = false);
    });
}

function isUserQualified() {
    let formStatus = getFormStatus();
    return formStatus == 'AutoQualified';
}