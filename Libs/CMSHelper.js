"use strict";

/**
 * Note: This probably shouldn't be packaged with LibJS... TODO
 * Consider removing it.
 * 
 *  A very simple content management system for uwappdev.github.io.
 * Although it is intended to be usable for changes to page content,
 * its primary goal is for management of tools that might be exposed
 * through the website. For example, displaying a survey without a commit
 * to Github.
 */
 
var PageDataHelper = {};
var ContentManager = {};

ContentManager.URL_PAGE_SPECIFIER_START = "?="; // Use this string to requestF a specific page.
ContentManager.currentPage = null;
ContentManager.SEARCH_CHAR = "→";
ContentManager.PAGE_CHANGE_EVENT = "PAGE_CHANGED_CMS";
ContentManager.UPDATE_PAGE_NOTIFY = "PAGE_SPECIFIC_CHANGED: ";
ContentManager.PAGE_NOT_FOUND = `<h2>We couldn't find that page!</h2>
                                <p>Please, check your spelling and try
                                   again. If you believe that this 
                                   message is in error, please
                                   contact a club administrator!</p>`;

/**
 *  Display a single page. If doNotAddToHistory is set,
 * the page will not be added to the window's set of backstacked pages.
 * Use forceReload to reload a page (set to true).
 */
ContentManager.displayPage = 
async function(name, doNotAddToHistory, forceReload)
{
    // Get elements.
    let contentZone = document.querySelector("#mainData");
    
    // Animate it!
    contentZone.parentElement.classList.add("shrinkGrow");
    
    // Check: Are we already on the page?
    if (ContentManager.currentPage === name && !forceReload)
    {
        return; // No need to load it twice.
    }
    
    await PageDataHelper.awaitLoad(); // Make sure we've loaded the page.
    
    ContentManager.currentPage = name;
    
    // Default values
    name = name || PageDataHelper.defaultPage;
    
    // Set content.
    const pageContent = await PageDataHelper.getPageContent(name);
    contentZone.innerHTML = pageContent || ContentManager.PAGE_NOT_FOUND;
    
    // Did the page request a background?
    JSHelper.Notifier.notify(BACKGROUND_CHANGE_EVENT, PageDataHelper.pageBackgrounds[name]);
    
    // Cleanup animation
    setTimeout(() =>
    {
        contentZone.parentElement.classList.remove("shrinkGrow");
    }, ANIM_SHRINK_GROW_DURATION); // We assume it's safe after a ANIM_SHRINK_GROW_DURATION.
    
    // Push to backstack.
    if (window.history && !doNotAddToHistory)
    {
        const state = { pageName: name },
              title = '',
              url   = ContentManager.URL_PAGE_SPECIFIER_START + name;
              
        window.history.pushState(state, title, url);
    }
    
    // If the pages list was reloaded, reload the page!
    while (true)
    {
        let result = await JSHelper.Notifier.waitForAny(PageDataHelper.PAGES_RELOAD, 
                ContentManager.PAGE_CHANGE_EVENT, ContentManager.UPDATE_PAGE_NOTIFY + name);
        
        
        // Stop if a new page was loaded.
        if (result.event === ContentManager.PAGE_CHANGE_EVENT)
        {
            break;
        }
        
        // Otherwise, reload the current page.
        ContentManager.displayPage(name, true, true); // Don't add it to history again, force reload.
    }
};

// Load a page after a change in
//the backstack data!
ContentManager.onBackstackTransit =
function()
{
    let requestedPage = ContentManager.getURLRequestedPage() || PageDataHelper.defaultPage;
    
    ContentManager.displayPage(requestedPage,
                               true); // Don't push to back stack again.
};

/**
 * Create buttons and connect them to actions.
 */
ContentManager.initializePages = 
async function()
{
    let addedButtons = [];
    
    const createPageButton = (pageName, buttonZones, buttonPrecedence) =>
    {
        for (let i = 0; i < buttonZones.length; i++)
        {
            let newButton = 
            HTMLHelper.addButton(pageName, buttonZones[i], () =>
            {
                ContentManager.displayPage(pageName);
            });
            
            newButton.style.order = buttonPrecedence || 0;
            
            addedButtons.push(newButton);
        }
    };
    
    // Clear all page buttons that have been created.
    const clearButtons = async () =>
    {
        while (addedButtons.length > 0)
        {
            let lastButton = addedButtons.pop();
            
            // Shrink it.
            lastButton.style.filter = "opacity(100%)";
            lastButton.style.transition = "0.1s ease filter";
            
            await JSHelper.nextAnimationFrame();
            lastButton.style.filter = "opacity(0%)";
            
            await JSHelper.waitFor(100); // Wait 100ms.
            lastButton.remove(); // Delete it.
        }
    };
    
    // Load page shortcuts.
    const loadButtons = () =>
    {
        let buttonAreas = document.querySelectorAll(".navigationButtons");
        let pageName;
    
        // Create a button for every linked page.
        for (let pageName in PageDataHelper.linkedPages)
        {
            createPageButton(pageName, buttonAreas, PageDataHelper.linkedPages[pageName]);
        }
        
        // Refresh buttons on edit.
        (async () =>
        {
            await JSHelper.Notifier.waitFor(PageDataHelper.PAGE_BUTTONS_CHANGED);
            
            await clearButtons();
            loadButtons();
        })();
    };

    await PageDataHelper.awaitLoad();
    
    loadButtons();
    
    // Check the URL -- has a specific page been linked to?
    let requestedPage = ContentManager.getURLRequestedPage() || PageDataHelper.defaultPage;
    
    // Display it.
    ContentManager.displayPage(requestedPage);
};

/**
 * Get the name of the page requested by the page's address bar.
 * If no page is requested, undefined is returned.
 */
ContentManager.getURLRequestedPage = () =>
{
    const specifierIndex = location.href.indexOf(ContentManager.URL_PAGE_SPECIFIER_START);
    let requestedPage = undefined;
    
    // Find the requested page.
    if (location.href && specifierIndex > location.href.lastIndexOf("/"))
    {
        // Get the page's name.
        requestedPage = location.href.substring
        (
            specifierIndex + ContentManager.URL_PAGE_SPECIFIER_START.length
        );
    }
    
    return requestedPage;
};

/**
 * Display UI letting users edit/manage pages.
 */
ContentManager.editPages = () =>
{
    const pageEditWindow = SubWindowHelper.create(
    { 
        title: "Manage Pages",
        className: "pageManagementWindow",
        minWidth: 256,
        minHeight: 100,
        fixWindowSize: true
    });
    
    // Enable flex-boxing.
    pageEditWindow.enableFlex("row");
    
    // Create both the left and right panes.
    const leftPane = document.createElement("div");
    const rightPane = document.createElement("div");
    
    // Styling.
    leftPane.classList.add("pageListManage");
    rightPane.classList.add("pageEditManage");
    
    // Add both to the window.
    pageEditWindow.appendChild(leftPane);
    pageEditWindow.appendChild(rightPane);
    
    // Add content to panes.
    let searchInput, pageEditor;
    
    const searchPanel = document.createElement("div");
    searchPanel.classList.add("searchContainer");
    
    // Create the results display.
    const resultsDisplay = document.createElement("div");
    resultsDisplay.style.display = "flex";
    resultsDisplay.style.flexDirection = "column";
    
    let reSearch = () => {};
    let currentPage = undefined;
    
    // Manage search.
    const runSearch = async () =>
    {
        reSearch = async (queryText) =>
        {
            const results = await PageDataHelper.query(queryText);
            
            const createListItem = (pageTitle) =>
            {
                const listItem = document.createElement("div");
                listItem.setAttribute("tabIndex", 2);
                listItem.classList.add("pageListItemManage");
                
                listItem.innerText = pageTitle;
                
                listItem.addEventListener("click", () =>
                {
                    // Select it.
                    if (currentPage && currentPage.classList)
                    {
                        currentPage.classList.remove("selected");
                    }
                    
                    currentPage = listItem;
                    currentPage.classList.add("selected");
                    
                    pageEditor.editPage(pageTitle);
                });
                
                // If the item IS the currently-selected,
                //note this.
                if (pageTitle == pageEditor.getPageName())
                {
                    listItem.classList.add("selected");
                }
                
                // If the item is published, note that, too.
                if (PageDataHelper.isPublished(pageTitle))
                {
                    listItem.classList.add("published");
                    
                    listItem.setAttribute("title", "Edit published " + pageTitle);
                }
                else
                {
                    listItem.setAttribute("title", "Edit " + pageTitle);
                }
                
                resultsDisplay.appendChild(listItem);
            };
            
            // Clear the results.
            resultsDisplay.innerHTML = "";
            
            for (var i = 0; i < results.length; i++)
            {
                createListItem(results[i][0]);
            }
        };
        
        await reSearch(searchInput.value);
    };
    
    // Re-run last search on reload of pages.
    (async () =>
    {
        while (!pageEditWindow.closed)
        {
            // Wait for data refresh.
            await JSHelper.Notifier.waitFor(PageDataHelper.PAGES_RELOAD);
            
            // Re-search.
            reSearch(searchInput.value);
        }
    })();
    
    searchInput = HTMLHelper.addInput("Search Pages...", "", "text", searchPanel, undefined,
                                            runSearch);
    const searchButton = HTMLHelper.addButton(ContentManager.SEARCH_CHAR, searchPanel, runSearch);
    searchButton.setAttribute("title", "Submit search");
    
    searchInput.setAttribute("tabIndex", 2);
    
    // Add elements to panes.
    leftPane.appendChild(searchPanel);
    leftPane.appendChild(resultsDisplay);
    
    // Spacer & commands below it.
    HTMLHelper.addSpacer(leftPane);
    
    // Hide and show left pane buttons.
    let showPane = HTMLHelper.addButton("Show Pane", rightPane, () =>
    {
        leftPane.classList.remove("hidden");
        showPane.classList.add("hidden");
    });
    
    showPane.classList.add("showPane");
    showPane.classList.add("hidden");
    
    HTMLHelper.addButton("Hide Pane", leftPane, () =>
    {
        leftPane.classList.add("hidden");
        showPane.classList.remove("hidden");
    });
    
    // Display a warning if the user isn't an admin.
    (async () =>
     {
        if (!(await AuthHelper.isAdmin()))
        {
            await SubWindowHelper.alert("Danger!", "It looks like you aren't an admin. This editor probably won't work, but you can try to use it anyways.");
        }
     })();

    // Actually create the editor.
    pageEditor = PageEditor.create(rightPane);
    
    pageEditWindow.setOnCloseListener(() =>
    {
        pageEditor.close();
    });
};

/**
 * Add any global content-management controls to the page.
 * For example, a sign-in button and survey management tools.
 */
ContentManager.addCMSControls = 
async function(parent)
{
    AuthHelper.insertAuthCommands(parent);
    
    // Any windows opened by the CMS.
    let CMSWindows = [];
    
    // Wrap all content-management utilities in
    //a div.
    let cmsWrapper = document.createElement("div");
    
    cmsWrapper.style.display = "none";
    cmsWrapper.style.flexDirection = "column";
    
    // Add buttons to the CMS.
    HTMLHelper.addButton("Page Editor", cmsWrapper, () =>
    {
        ContentManager.setBladeClosed(true);
        
        ContentManager.editPages();
    });
    
    // Show the content-management system.
    const showCMS = () =>
    {
        cmsWrapper.style.display = "flex";
    };
    
    // Hide the content-management system.
    const hideCMS = () =>
    {
        cmsWrapper.style.display = "none";
    };
    
    // Add the wrapper.
    parent.appendChild(cmsWrapper);
    
    while (true)
    {
        if (!AuthHelper.isSignedIn())
        {
            await JSHelper.Notifier.waitFor(AuthHelper.SIGN_IN_EVENT);
        }
        
        showCMS();
        
        await JSHelper.Notifier.waitFor(AuthHelper.SIGN_OUT_EVENT);
        
        hideCMS();
    }
};

/**
 * Add a search bar that permits searches through page titles and content.
 */
ContentManager.addPageSearch = 
function(parent)
{
    let searchInput, searchResultsDiv; // Define elements here so they can be accessed in helper
                                    //functions.
    
    const submitSearch = async () =>
    {
        const searchText = searchInput.value;
        
        // Get search results!
        const results = await PageDataHelper.query(searchText);
        
        // Clear the results list.
        searchResultsDiv.innerHTML = "";
        
        const makePageLink = (pageTitle, relevancy) =>
        {
            HTMLHelper.addButton(pageTitle + " (+" + relevancy + ")", searchResultsDiv,
            () =>
            {
                ContentManager.toggleBlade();
                ContentManager.displayPage(pageTitle);
                
                // Clear the search input.
                searchInput.value = "";
            });
        };
        
        // Note the number of results.
        let foundText = HTMLHelper.addTextElement("Found " + results.length + " result" + 
                                                 (results.length == 1 ? '' : 's') + ".",
                                                  searchResultsDiv);
        
        // Link to each.
        for (let i = 0; i < results.length; i++)
        {
            makePageLink(results[i][0], results[i][1]);
        }
        
        // Focus the results.
        searchResultsDiv.setAttribute("tabindex", 2);
        searchResultsDiv.focus();
        
        foundText.setAttribute("tabIndex", 2);
        foundText.focus();
    };
    
    // Clear results on data refresh.
    (async () =>
    {
        while (true)
        {
            // Wait for data refresh.
            await JSHelper.Notifier.waitFor(PageDataHelper.PAGES_RELOAD);
            
            // Clear results.
            searchResultsDiv.innerHTML = "...";
        }
    })();

    searchResultsDiv = document.createElement("div"); 
    const searchDiv     = document.createElement("div");
    searchInput  = HTMLHelper.addInput("Search Pages", "", "text", 
                                            searchDiv, undefined, submitSearch);
    const searchButton = HTMLHelper.addButton(ContentManager.SEARCH_CHAR, searchDiv, submitSearch);
    searchButton.setAttribute("title", "Submit search.");
    
    searchDiv.classList.add("searchContainer");
    searchResultsDiv.classList.add("searchResults");
    
    parent.appendChild(searchResultsDiv);
    parent.appendChild(searchDiv);
};

// Show/hide the blade.
ContentManager.toggleBlade = () => {};
ContentManager.setBladeClosed = (closed) => {};

/**
 *  Connects the main menu's UI to actions, among other things, connecting its
 * logo element to a menu.
 */
ContentManager.initializeMainMenu = 
async function()
{
    let logoDisplay = document.querySelector(".navabar .logo");
    let menuBlade = document.querySelector("#mainBlade"); // Lets call them "blades" --
                                                          //I think that's what they're called.
    
    const showHideBlade = () =>
    {
        menuBlade.classList.toggle("bladeClosed");
        menuBlade.classList.toggle("bladeOpen");
        
        logoDisplay.classList.toggle("requestRotate");
    };
    
    // Click listeners for showing/hiding.
    logoDisplay.addEventListener("click", showHideBlade);
    logoDisplay.setAttribute("tabindex", 1); // Allow focusing.
    logoDisplay.setAttribute("title", "Push to access the main menu. Use as a button." + 
                                       " After opening, items should be selectable with the " +
                                       " up and down arrow keys. ");
    
    ContentManager.toggleBlade = showHideBlade;
    ContentManager.setBladeClosed = (closed) =>
    {
        if (closed)
        {
            menuBlade.classList.add("bladeClosed");
            menuBlade.classList.remove("bladeOpen");
            logoDisplay.classList.remove("requestRotate");
        }
        else
        {
            menuBlade.classList.remove("bladeClosed");
            menuBlade.classList.add("bladeOpen");
            logoDisplay.classList.add("requestRotate");
        }
    };
    
    // Add a sign-in button and a search bar.
    ContentManager.addCMSControls(menuBlade);
    HTMLHelper.addSpacer         (menuBlade);
    ContentManager.addPageSearch (menuBlade);
    
    while (true)
    {
        await JSHelper.Notifier.waitFor(AuthHelper.AUTH_MENU_USED);
        ContentManager.setBladeClosed  (true);
    }
};

// Handle all tasks related to initialization.
//Should be called by main.
ContentManager.init = () =>
{
    const me = ContentManager;
    
    me.initializePages();
    me.initializeMainMenu();
};

// Await page load, but push the request to a
//background frame to ensure JSHelper has loaded.
requestAnimationFrame(
async () =>
{
    await JSHelper.Notifier.waitFor(JSHelper.GlobalEvents.PAGE_SETUP_COMPLETE, true);
    
    // Enable backstack navigation.
    window.addEventListener("popstate", ContentManager.onBackstackTransit);
});
