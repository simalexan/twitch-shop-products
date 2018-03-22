const ApiBuilder = require('claudia-api-builder');
const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');

const api = new ApiBuilder(),
  dynamoDB = new AWS.DynamoDB.DocumentClient();

const SHOPS_TABLE = 'shops';
const SHOPS_ID_VALIDATION_MESSAGE = `Sorry, you haven't provided a shopsId`;
const SHOPS_NOT_FOUND = `Sorry, there isn't such a shop`;
const PRODUCTS_ID_VALIDATION_MESSAGE = `Sorry, you haven't provided a productId`;
const PRODUCT_NOT_FOUND = `Sorry, there isn't such a product`;
const PRODUCT_NAME_VALIDATION_MESSAGE = `Sorry, you haven't provided a productName or it's shorter than 3 characters`;
const PRODUCT_PRICE_VALIDATION_MESSAGE = `Sorry, you haven't provided a productPrice or it's not a number`;

function getShop(shopId) {
    return dynamoDB.get({
        TableName: SHOPS_TABLE,
        Key: {
            shopsId: shopId
        }
    }).promise()
      .then(response => {
          if (!response.Item) throw new Error(SHOPS_NOT_FOUND);
          return response.Item;
        })
      .catch(err => err);
}

function updateShopProducts(shopId, products) {
    console.log('updating shop products');
    console.log(products);
    if (!products) throw new Error(`There are no products`);
    return getShop(shopId)
      .then(() => {
        console.log(shopId);
        console.log(products);
        let updateParams = {
            TableName: SHOPS_TABLE,
            Key: {
                shopsId: shopId
            },
            UpdateExpression: 'set products = :p',
            ExpressionAttributeValues: {
                ':p': products
            },
            ReturnValues: 'UPDATED_NEW'
        }
        return dynamoDB.update(updateParams)
            .promise()
            .catch(err => err);
       })
      .catch(err => err);
}

api.get('/shops/{shopId}/products', request => {
    let shopId = request.pathParams.shopId;
    if (!shopId) return SHOPS_ID_VALIDATION_MESSAGE;

    return dynamoDB.get({ 
        TableName: SHOPS_TABLE,
        Key: {
            shopsId: shopId
        }
    }).promise()
      .then(response => {
          console.log(response.Item);
          return response.Item.products || [];
      })
      .catch(err => err);
});

api.get('/shops/{shopId}/products/{productId}', request => {
    let shopId = request.pathParams.shopId;
    if (!shopId) return SHOPS_ID_VALIDATION_MESSAGE;

    let productId = request.pathParams.productId;
    if (!productId) return PRODUCTS_ID_VALIDATION_MESSAGE;

    return getShop(shopId)
      .then(shop => {
          console.log(productId);
          let product = shop.products.find(product => product.productsId === productId);
          console.log(product);
          if (!product) return PRODUCT_NOT_FOUND;
          return product;
       })
      .catch(err => err);
});

api.delete('/shops/{shopId}/products/{productId}', request => {
    let shopId = request.pathParams.shopId;
    if (!shopId) return SHOPS_ID_VALIDATION_MESSAGE;

    let productId = request.pathParams.productId;
    if (!productId) return PRODUCTS_ID_VALIDATION_MESSAGE;

    return getShop(shopId)
       .then(shop => {
          let foundProduct;
          shop.products.forEach((product, index) => {
              if (product.productsId === productId){
                  foundProduct = product;
                  shop.products.splice(index, 1);
              }
          });
          if (foundProduct) {
            return updateShopProducts(shop.shopsId, shop.products);
          } else {
            return PRODUCT_NOT_FOUND;
          }
       })
      .catch(err => err);
});

api.post('/shops/{shopId}/products', request => {

    let shopId = request.pathParams.shopId;
    if (!shopId) return SHOPS_ID_VALIDATION_MESSAGE;

    console.log(request.body);

    let productName = request.body.productName;
    if (!productName || productName.length < 3) return PRODUCT_NAME_VALIDATION_MESSAGE;

    let productPrice = request.body.productPrice;
    if (!productPrice || isNaN(productPrice)) return PRODUCT_PRICE_VALIDATION_MESSAGE;

     return getShop(shopId)
       .then(shop => {
         console.log(shop);
         if (!shop.products) {
             shop.products = []
         }
         console.log('adding a product');
         console.log(shop.products);
          shop.products.push({
              productsId: uuidv4(),
              productName: productName,
              productPrice: productPrice
          });
          console.log(shop);
          return updateShopProducts(shop.shopsId, shop.products);
       })
      .catch(err => err);
}, {status: 201});

api.put('/shops/{shopId}/products/{productId}', request => {

    console.log(request.body);
    let shopId = request.pathParams.shopId;
    if (!shopId) return SHOPS_ID_VALIDATION_MESSAGE;

    let productId = request.pathParams.productId;
    if (!productId) return SHOPS_ID_VALIDATION_MESSAGE;

    let productName = request.body.productName;
    if (!productName || productName.length < 3) return PRODUCT_NAME_VALIDATION_MESSAGE;

    let productPrice = request.body.productPrice;
    if (!productPrice || isNaN(productPrice)) return PRODUCT_PRICE_VALIDATION_MESSAGE;

     return getShop(shopId)
       .then(shop => {
        console.log(shop);
        let foundProduct;
          shop.products.forEach((product, index) => {
              console.log(index)
              console.log(product.productsId)
              console.log(productId);
              if (product.productsId == productId){
                foundProduct = product;
                shop.products[index].productName = productName;
                shop.products[index].productPrice = productPrice;
              }
          });
          if (foundProduct) {
            return updateShopProducts(shop.shopsId, shop.products);
          }
          return PRODUCT_NOT_FOUND;
       })
      .catch(err => err);
});

module.exports = api;