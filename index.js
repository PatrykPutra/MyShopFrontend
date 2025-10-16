
window.onload = async () => {
    apiBaseUrl = "http://localhost:5104"
    setupUserActions();
    loadSettings()
    await renderCategories();
    await renderProducts();
    await renderAdminPanel();

}

function loadSettings() {
    const sessionParameters =
    {
        searchPhrase: null,
        selectedCategory: null,
        pageSize: 5
    }
    for (const parameter in sessionParameters) {
        if (sessionStorage.getItem(parameter) == null) {
            sessionStorage.setItem(parameter, sessionParameters[parameter])
        }
    }

    const localParameters =
    {
        currencyName: "USD",
        selectedLanguage: "ENG"
    }
    for (const parameter in localParameters) {
        if (localStorage.getItem(parameter) == null) {
            localStorage.setItem(parameter, localParameters[parameter])
        }
    }
}

function setupUserActions() {
    const signInBtn = document.getElementById("signInBtn");
    signInBtn.addEventListener("click", () => openModal('signInModal'));
    document.getElementById("signInForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        if (document.getElementById("signInPassword").value !== document.getElementById("signInConfirmPassword").value) {
            displayError("signInForm", "Password confirmation desn't match.");
        }
        else {
            const form = document.getElementById("signInForm");
            const formData = new FormData(form);
            const newUser = { ...Object.fromEntries(formData), isAdmin: false }
            const json = JSON.stringify(newUser);
            const response = await fetch(`${apiBaseUrl}/api/SignIn/NewUser`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: json
                });
            if (response.ok) {
                displayMessage("signInForm", "New account has been created!");
                setTimeout(() => closeModal("signInModal"), 3000);
            }
            else {
                const data = await response.json();
                displayError("signInForm", data.error);
            }
        }
    });

    const loginBtn = document.getElementById("loginBtn");
    loginBtn.addEventListener("click", () => openModal("loginModal"));
    document.getElementById("loginForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        const form = document.getElementById("loginForm");
        const formData = new FormData(form);
        const json = JSON.stringify(Object.fromEntries(formData));
        const response = await fetch(`${apiBaseUrl}/api/SignIn/User`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: json
            });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("token", data.token);
            closeModal("loginModal", "loginForm");
            location.reload();
        }
        else {
            const data = await response.json();
            displayError("loginForm", data.error)
        }

    });

    const cartBtn = document.getElementById("cartBtn");
    cartBtn.addEventListener("click", async () => {
        await renderShoppingCart()
        openModal("cartModal")
    });

    const profileBtn = document.getElementById("profileBtn");
    profileBtn.addEventListener("click", async () => {
        const response = await fetch(`${apiBaseUrl}/api/UserInfo`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            }
        )
        if (response.ok) {
            const userInfo = await response.json()
            document.getElementById("profileUsername").textContent = userInfo.userName
            document.getElementById("profileEmail").textContent = userInfo.email
        }
        openModal("profileModal")
    });

    const ordersBtn = document.getElementById("ordersBtn");
    ordersBtn.addEventListener("click", () => {
        openModal("ordersModal");
        renderOrders();
    });

    const settingsBtn = document.getElementById("settingsBtn");
    settingsBtn.addEventListener("click", () => openModal("settingsModal"));
    document.getElementById("settingsForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const form = document.getElementById("settingsForm");
        const formData = new FormData(form);
        const settings = Object.fromEntries(formData);
        for (const param in settings) {
            localStorage.setItem(param, settings[param]);
        }
        closeModal("settingsModal");
    });
    document.getElementById("currencySelector").addEventListener("change", () => {
        const currencySelector = document.getElementById("currencySelector");
        const selectedValue = currencySelector.children.find(option => option.getAttribute("value") === currencySelector.value);
        selectedValue.setAttribute("selected", true);
    });

    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn.addEventListener("click", () => {
        openModal("logoutModal");
        document.getElementById("confirmLogoutBtn").addEventListener("click", () => {
            localStorage.removeItem("token");
            location.reload();
        })

    });

    const searchBar = document.getElementById("searchBar")
    searchBar.addEventListener("change", async () => {
        sessionStorage.setItem("searchPhrase", searchBar.value)
        await renderProducts()
    })

}

async function renderAdminPanel() {
    const userInfo = await getUserInfo();
    if (userInfo.isAdmin === true) {
        const adminModeBar = document.createElement("div");
        adminModeBar.textContent = "Admin mode";
        adminModeBar.setAttribute("class", "admin-mode-bar");
        const headerContainer = document.getElementById("headerContainer");
        headerContainer.prepend(adminModeBar);
    }

}

async function renderCategories() {
    const data = await loadCategories()

    const categoriesContainer = document.getElementById("categoryList")
    const liElement = document.createElement("li")
    const aElement = document.createElement("a")
    aElement.textContent = "All"
    aElement.addEventListener("click", () => categoryClicked(aElement))
    aElement.style.fontWeight = 'bold'
    sessionStorage.setItem("selectedCategory", null)
    liElement.appendChild(aElement)
    categoriesContainer.appendChild(liElement)

    const userInfo = await getUserInfo()

    if (userInfo.isAdmin === true) {
        const addBtn = document.createElement("button");
        addBtn.setAttribute("class", "edit-button")
        addBtn.textContent = "+";
        addBtn.addEventListener("click", async () => {
            const newCategoryInput = document.getElementById("newCategoryInput")
            newCategoryInput.setAttribute("placeholder", "New category")
            editCategoryForm.addEventListener("submit", async (event) => {
                event.preventDefault()
                const categoryDto = { name: newCategoryInput.value }
                const json = JSON.stringify(categoryDto)
                const response = await fetch(`${apiBaseUrl}/api/ItemCategory`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${localStorage.getItem("token")}`,
                            "Content-Type": "application/json"
                        },
                        body: json
                    })
                if (response.ok) {
                    closeModal("editCategoryModal")
                    location.reload()
                }
                else {
                    const data = await response.json()
                    displayError("editCategoryForm", data.error)
                }
            })

            openModal("editCategoryModal");

        })

        document.getElementById("categoriesHeader").appendChild(addBtn)
    }

    data.forEach(category => {
        const liElement = document.createElement("li")
        const aElement = document.createElement("a")
        aElement.textContent = category.name
        aElement.setAttribute("data-categoryId", category.id)
        aElement.addEventListener("click", () => categoryClicked(aElement))
        liElement.appendChild(aElement)

        if (userInfo.isAdmin === true && category.id != 1) {

            const buttonPanel = document.createElement("div")
            buttonPanel.setAttribute("class", "categories-button-panel")

            const editBtn = document.createElement("button");
            editBtn.textContent = "↙";
            editBtn.addEventListener("click", async () => {
                const newCategoryInput = document.getElementById("newCategoryInput")
                newCategoryInput.value = category.name
                editCategoryForm.addEventListener("submit", async (event) => {
                    event.preventDefault()
                    const categoryDto = { name: newCategoryInput.value }
                    const json = JSON.stringify(categoryDto)
                    const response = await fetch(`${apiBaseUrl}/api/ItemCategory/${category.id}`,
                        {
                            method: "PUT",
                            headers: {
                                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                                "Content-Type": "application/json"
                            },
                            body: json
                        })
                    if (response.ok) {
                        closeModal("editCategoryModal")
                        location.reload()
                    }
                    else {
                        const data = await response.json()
                        displayError("editCategoryForm", data.error)
                    }
                })

                openModal("editCategoryModal");
            })

            const removeBtn = document.createElement("button")
            removeBtn.textContent = "x"
            removeBtn.addEventListener("click", async () => {
                if (window.confirm(`Do you wish to remove category: ${category.name}?`)) {

                    const response = await fetch(`${apiBaseUrl}/api/ItemCategory/${category.id}`,
                        {
                            method: "DELETE",
                            headers: {
                                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                                "Content-Type": "application/json"
                            }
                        })
                    if (response.ok) {
                        window.prompt(`Category ${category.name} has been deleted successfully`)
                        location.reload()
                    }
                    else {
                        const data = await response.json()
                        window.prompt(`${data.error}`)
                    }
                }
            })

            buttonPanel.appendChild(editBtn)
            buttonPanel.appendChild(removeBtn)
            liElement.appendChild(buttonPanel);
        }

        categoriesContainer.appendChild(liElement)

    })
}

async function loadCategories() {
    const response = await fetch(`${apiBaseUrl}/api/ItemCategory`)
    const data = await response.json()
    return data
}

async function categoryClicked(category) {
    const categoryElements = document.querySelectorAll(`#categoryList li`)
    categoryElements.forEach(liElement => {
        const aElement = liElement.querySelector('a')
        aElement.style.fontWeight = 'normal'
    })
    category.style.fontWeight = 'bold';
    sessionStorage.setItem("selectedCategory", category.getAttribute("data-categoryId"));
    await renderProducts();
}

async function renderProducts(pageNumber) {
    const data = await loadProducts(pageNumber)
    const productsContainer = document.getElementById("productList")
    productsContainer.replaceChildren();
    renderPagination(data.pageNumber, data.totalPages)

    const userInfo = await getUserInfo()
    const categories = userInfo.isAdmin === true ? await loadCategories() : undefined

    if (userInfo.isAdmin === true) {
        const addProductCard = createAddProductCard(categories)
        productsContainer.appendChild(addProductCard)
    }

    data.items.forEach(product => {
        const productCard = createProductCard(product, categories, userInfo)
        productsContainer.appendChild(productCard)
    })
}

function createAddProductCard(categories) {
    const addProductCard = document.createElement("div")
    addProductCard.setAttribute("class", "product-card")
    addProductCard.style.justifyContent = "center"

    const addProductBtn = document.createElement("button")
    addProductBtn.textContent = "Add"
    addProductBtn.addEventListener("click", async () => {
        const inputProductForm = document.getElementById("productInputForm")
        const inputProductName = document.getElementById("inputProductName")
        const inputProductQuantity = document.getElementById("inputProductQuantity")
        const inputProductPrice = document.getElementById("inputProductPrice")
        const inputProductDescription = document.getElementById("inputProductDescription")
        const inputProductCategory = document.getElementById("inputProductCategory")
        inputProductCategory.replaceChildren()

        categories.forEach(category => {
            const categoryOption = document.createElement("option")
            categoryOption.setAttribute("value", category.id)
            categoryOption.textContent = category.name
            inputProductCategory.appendChild(categoryOption)
        })

        inputProductForm.addEventListener("submit", async (event) => {
            event.preventDefault()
            const productDto =
            {
                name: inputProductName.value,
                text: inputProductDescription.value,
                priceUSD: inputProductPrice.value,
                quantity: inputProductQuantity.value,
                categoryId: inputProductCategory.value
            }
            const json = JSON.stringify(productDto)

            const response = await fetch(`${apiBaseUrl}/api/ShopItem`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json"
                    },
                    body: json
                }
            )
            if (response.ok) {
                closeModal("productInputModal")
                location.reload()
            }
            else {
                const data = await response.json
                displayError("productInputForm", data.error)
            }

        })

        openModal("productInputModal")
    })
    addProductCard.appendChild(addProductBtn)
    return addProductCard
}

function createProductCard(product, categories, userInfo) {
    const productCard = document.createElement("div")
    productCard.setAttribute("class", "product-card")
    productCard.setAttribute("id", product.id)

    const productName = document.createElement("h4")
    productName.textContent = product.name
    productName.addEventListener("click", () => {
        openModal("productModal")
        const modalProductName = document.getElementById("modalProductName")
        modalProductName.textContent = product.name
        const modalProductDescription = document.getElementById("modalProductDescription")
        modalProductDescription.textContent = product.text
        const modalProductPrice = document.getElementById("modalProductPrice")
        modalProductPrice.textContent = product.price + " " + product.priceCurrency
    })

    const productPrice = document.createElement("p")
    productPrice.textContent = product.price + " " + product.priceCurrency

    const quantitySelector = document.createElement("input")
    quantitySelector.setAttribute("type", "number")
    quantitySelector.style.width = "48px"
    quantitySelector.setAttribute("min", 1)
    quantitySelector.value = 1

    const addToCartBtn = document.createElement("button")
    addToCartBtn.textContent = "Add to cart"
    addToCartBtn.addEventListener("click", () => addToCartClicked(product.id, quantitySelector.value))

    const documentFragment = document.createDocumentFragment();
    documentFragment.appendChild(productCard);
    productCard.appendChild(productName);
    productCard.appendChild(productPrice);
    productCard.appendChild(quantitySelector);
    productCard.appendChild(addToCartBtn);

    if (userInfo.isAdmin === true) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "↙";
        editBtn.setAttribute("class", "edit-button");
        editBtn.addEventListener("click", () => {
            const inputProductForm = document.getElementById("productInputForm")
            const inputProductName = document.getElementById("inputProductName")
            inputProductName.value = product.name
            const inputProductQuantity = document.getElementById("inputProductQuantity")
            inputProductQuantity.value = product.quantity
            const inputProductPrice = document.getElementById("inputProductPrice")
            inputProductPrice.value = product.priceUSD
            const inputProductDescription = document.getElementById("inputProductDescription")
            inputProductDescription.value = product.text

            const inputProductCategory = document.getElementById("inputProductCategory")

            categories.forEach(category => {
                const categoryOption = document.createElement("option")
                categoryOption.setAttribute("value", category.id)
                categoryOption.textContent = category.name
                if (category.id == product.categoryId) categoryOption.setAttribute("selected", true)

                inputProductCategory.appendChild(categoryOption)
            })

            inputProductForm.addEventListener("submit", async (event) => {
                event.preventDefault()
                const productDto =
                {
                    name: inputProductName.value,
                    text: inputProductDescription.value,
                    priceUSD: inputProductPrice.value,
                    quantity: inputProductQuantity.value,
                    categoryId: inputProductCategory.value
                }
                const json = JSON.stringify(productDto)

                const response = await fetch(`${apiBaseUrl}/api/ShopItem/${product.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Authorization": `Bearer ${localStorage.getItem("token")}`,
                            "Content-Type": "application/json"
                        },
                        body: json
                    }
                )
                if (response.ok) {
                    closeModal("productInputModal")
                    location.reload()
                }
                else {
                    const data = await response.json
                    displayError("productInputForm", data.error)
                }

            })

            openModal("productInputModal")
        })
        productCard.appendChild(editBtn);

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "x";
        removeBtn.setAttribute("class", "edit-button");
        removeBtn.addEventListener("click", async () => {
            if (window.confirm(`Do you wish to delete product: ${product.name}?`)) {
                const response = await fetch(`${apiBaseUrl}/api/ShopItem/${product.id}`,
                    {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${localStorage.getItem("token")}`
                        }
                    }
                )
            }
        })
        productCard.appendChild(removeBtn);
    }
    return documentFragment
}

async function loadProducts(pageNumber, currencyName) {
    const queryParameters =
    {
        categoryId: sessionStorage.getItem("selectedCategory"),
        currencyName: currencyName ?? localStorage.getItem("currencyName"),
        pageSize: sessionStorage.getItem("pageSize"),
        pageNumber: pageNumber ?? 1,
        searchPhrase: sessionStorage.getItem("searchPhrase")
    }
    const query = new URLSearchParams();
    for (const param in queryParameters) {
        if (queryParameters[param] != "null") query.append(param, queryParameters[param]);
    }
    const response = await fetch(`${apiBaseUrl}/api/ShopItem/All?` + query.toString())
    const data = await response.json()
    return data
}

function renderPagination(pageNumber, totalPages) {

    const paginationPanel = document.getElementById("paginationPanel")
    paginationPanel.replaceChildren()
    if (pageNumber > 1) {
        const previousBtn = document.createElement("button")
        previousBtn.textContent = "< Previous"
        previousBtn.addEventListener("click", async () => {
            await renderProducts(pageNumber - 1);
        })
        paginationPanel.appendChild(previousBtn)
    }

    const firstPageBtn = document.createElement("button")
    firstPageBtn.textContent = 1
    if (pageNumber == 1) {
        firstPageBtn.setAttribute("class", "active")
        firstPageBtn.setAttribute("disabled", true)
    }
    firstPageBtn.addEventListener("click", async () => {
        await renderProducts();
    })
    paginationPanel.appendChild(firstPageBtn)
    if (pageNumber >= 5) {
        const ellipsis = document.createElement("label")
        ellipsis.textContent = "..."
        paginationPanel.appendChild(ellipsis)
    }

    let startRange
    let endRange
    if (pageNumber >= 5 && totalPages >= 5) {
        startRange = pageNumber - 2
        endRange = totalPages > pageNumber + 2 ? pageNumber + 2 : totalPages
    }
    if (pageNumber < 5 && totalPages >= 5) {
        startRange = 2
        endRange = 5
    }
    if (pageNumber < 5 && totalPages < 5) {
        startRange = 2
        endRange = totalPages
    }

    for (let i = startRange; i <= endRange; i++) {
        const paginationBtn = document.createElement("button")
        paginationBtn.textContent = i
        if (i === pageNumber) {
            paginationBtn.setAttribute("class", "active")
            paginationBtn.setAttribute("disabled", true)
        }
        paginationBtn.addEventListener("click", async () => {
            await renderProducts(i);
        })
        paginationPanel.appendChild(paginationBtn)
    }


    const totalPageslabel = document.createElement("label")
    totalPageslabel.textContent = `of ${totalPages}`
    paginationPanel.appendChild(totalPageslabel)

    if (pageNumber != totalPages) {
        const nextPageBtn = document.createElement("button")
        nextPageBtn.textContent = "Next >"
        nextPageBtn.addEventListener("click", async () => {
            await renderProducts(pageNumber + 1)
        })
        paginationPanel.appendChild(nextPageBtn)
    }
}

async function addToCartClicked(productId, productQuantity) {
    const json = JSON.stringify({ itemId: productId, quantity: productQuantity });
    const response = await fetch(`${apiBaseUrl}/api/ShoppingCart/AddItem`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            },
            body: json
        });
    if (response.ok) displayMessage("productList", "Item succesfully added to shopping cart.");
    else {
        const data = await response.json();
        displayError("productList", data.error);
    }
}

async function renderShoppingCart() {
    const data = await loadShoppingCart();
    const shopItems = data.shopItems;
    const cartItemsContainer = document.getElementById("cartItemsList")
    cartItemsContainer.replaceChildren();

    shopItems.forEach(shopItem => {
        const cartItemCard = createCartItemCard(shopItem)
        cartItemsContainer.appendChild(cartItemCard);
    }
    );

    const submitOrderBtn = document.getElementById("submitOrderBtn")
    submitOrderBtn.addEventListener("click", async () => {
        const response = await fetch(`${apiBaseUrl}/api/Order`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
            });
        if (response.ok) {
            renderShoppingCart();
            displayMessage("cartItemsList", "Order has been submited sucessfully");
        }
        else {
            const data = await response.json();
            displayError("cartItemsList", data.error);
        }
    })

}

function createCartItemCard(shopItem) {
    const shoppingCartItem = document.createElement("div");
    shoppingCartItem.setAttribute("class", "product-card")

    const cartItemName = document.createElement("h4");
    cartItemName.textContent = shopItem.name;

    const cartItemPrice = document.createElement("p");
    cartItemPrice.textContent = shopItem.price + " " + shopItem.priceCurrency;

    const quantitySelector = document.createElement("input");
    quantitySelector.setAttribute("type", "number");
    quantitySelector.style.width = "48px";
    quantitySelector.setAttribute("min", 1);
    quantitySelector.value = shopItem.quantity;
    quantitySelector.addEventListener("change", async () => {
        const json = JSON.stringify({ itemId: shopItem.id, quantity: quantitySelector.value });
        const response = await fetch(`${apiBaseUrl}/api/ShoppingCart/UpdateItem`,
            {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
                body: json
            });

    })

    const removeCartItemBtn = document.createElement("button");
    removeCartItemBtn.textContent = "Remove";
    removeCartItemBtn.addEventListener("click", async () => {
        const json = JSON.stringify({ itemId: shopItem.id, quantity: shopItem.quantity });
        const response = await fetch(`${apiBaseUrl}/api/ShoppingCart/RemoveItem`,
            {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
                body: json
            });
        if (response.ok) {
            await renderShoppingCart();
            displayMessage("cartItemsList", "Item has been successfully removed from the cart.");
        }
        else {
            const data = response.json();
            displayError("cartItemsList", data.error);
        }

    });

    const documentFragment = document.createDocumentFragment();
    documentFragment.appendChild(shoppingCartItem);

    shoppingCartItem.appendChild(cartItemName);
    shoppingCartItem.appendChild(cartItemPrice);
    shoppingCartItem.appendChild(quantitySelector);
    shoppingCartItem.appendChild(removeCartItemBtn);
    return documentFragment
}

async function loadShoppingCart() {
    const query = new URLSearchParams();
    query.append("currencyName", localStorage.getItem("currencyName"));
    const response = await fetch(`${apiBaseUrl}/api/ShoppingCart?` + query.toString(),
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });
    const data = await response.json();
    return data;
}

async function renderOrders() {
    const data = await loadOrders();
    const orders = data.orders;
    const ordersContainer = document.getElementById("ordersList")
    ordersContainer.setAttribute("class", "orders-list");
    ordersContainer.replaceChildren();

    orders.forEach(order => {
        const orderContainer = createOrderCard(order)
        ordersContainer.appendChild(orderContainer);
    });
}

function createOrderCard(order) {
    const orderContainer = document.createElement("div");
    orderContainer.setAttribute("class", "order-card");
    const orderNumber = document.createElement("h4");
    orderNumber.textContent = "Order no. " + order.id;
    orderContainer.appendChild(orderNumber);
    order.items.forEach(item => {
        const orderItem = document.createElement("div");
        orderItem.setAttribute("class", "order-card-row")
        const orderItemName = document.createElement("h4");
        orderItemName.textContent = item.name;
        const orderItemPrice = document.createElement("p");
        orderItemPrice.textContent = item.quantity + "x" + item.price + " " + item.currencyName;
        const orderItemTotalPrice = document.createElement("p");
        orderItemTotalPrice.textContent = parseFloat(item.quantity) * parseFloat(item.price) + item.currencyName;

        const documentFragment = document.createDocumentFragment();
        documentFragment.appendChild(orderItem);
        orderItem.appendChild(orderItemName);
        orderItem.appendChild(orderItemPrice);
        orderItem.appendChild(orderItemTotalPrice);

        orderContainer.appendChild(documentFragment);
    })

    const orderSummary = document.createElement("div");
    orderSummary.setAttribute("class", "order-card-row")
    const documentFragment = document.createDocumentFragment();
    documentFragment.appendChild(orderSummary);
    const orderTotal = document.createElement("p");
    orderTotal.textContent = "Total: "
    const orderTotalPrice = document.createElement("p");
    orderTotalPrice.textContent = order.totalPrice + order.currencyName;
    orderSummary.appendChild(orderTotal);
    orderSummary.appendChild(orderTotalPrice);

    orderContainer.appendChild(documentFragment);
    return orderContainer;
}

async function loadOrders() {
    const query = new URLSearchParams();
    query.append("currencyName", localStorage.getItem("currencyName"));
    const response = await fetch(`${apiBaseUrl}/api/Order?` + query.toString(),
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });
    const data = await response.json();
    return data;
}

function closeModal(modalId, formId) {
    document.getElementById(modalId).style.display = 'none';
    if (formId !== undefined) {
        document.getElementById(formId).reset()
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function displayError(containerId, message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "alert error";
    errorDiv.innerText = message;
    document.getElementById(containerId).prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function displayMessage(containerId, message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "alert success";
    errorDiv.textContent = message;
    document.getElementById(containerId).prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

async function getUserInfo() {
    const response = await fetch(`${apiBaseUrl}/api/UserInfo`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });
    const data = await response.json();
    return data;
}
