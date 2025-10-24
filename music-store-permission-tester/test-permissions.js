/**
 * Music Store - Comprehensive Permission Testing Suite
 * 
 * This script performs in-depth testing of user permissions and access control
 * for both admin and regular users across all API endpoints.
 * 
 * Run with: node test-permissions.js
 */

import axios from 'axios';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@musicstore.com';
const ADMIN_PASSWORD = 'Admin123!';
const USER_EMAIL = 'user@musicstore.com';
const USER_PASSWORD = 'User123!';

// Test Results Tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// Tokens storage
let adminToken = null;
let userToken = null;
let testAlbumId = null;
let testCategoryId = null;
let testOrderId = null;
let testCartItemId = null;

/**
 * Utility Functions
 */

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ✗ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    case 'header':
      console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
      console.log(chalk.cyan.bold(`${message}`));
      console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
      break;
    case 'section':
      console.log(chalk.blue.bold(`\n--- ${message} ---`));
      break;
    default:
      console.log(chalk.white(`[${timestamp}] ℹ ${message}`));
  }
}

function recordTest(testName, passed, error = null) {
  results.total++;
  if (passed) {
    results.passed++;
    log(`${testName}: PASSED`, 'success');
  } else {
    results.failed++;
    log(`${testName}: FAILED`, 'error');
    if (error) {
      results.errors.push({ test: testName, error: error.message || error });
      log(`  Error: ${error.message || error}`, 'error');
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authentication Tests
 */

async function testAuthentication() {
  log('Testing Authentication System', 'section');

  // Test 1: Admin Login
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    
    if (response.data.success && response.data.data.token && response.data.data.user.role === 'admin') {
      adminToken = response.data.data.token;
      recordTest('Admin Login', true);
      log(`Admin Token: ${adminToken.substring(0, 20)}...`, 'info');
    } else {
      recordTest('Admin Login', false, 'Invalid response structure or role');
    }
  } catch (error) {
    recordTest('Admin Login', false, error.response?.data?.message || error.message);
  }

  // Test 2: User Login
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
    
    if (response.data.success && response.data.data.token && response.data.data.user.role === 'user') {
      userToken = response.data.data.token;
      recordTest('User Login', true);
      log(`User Token: ${userToken.substring(0, 20)}...`, 'info');
    } else {
      recordTest('User Login', false, 'Invalid response structure or role');
    }
  } catch (error) {
    recordTest('User Login', false, error.response?.data?.message || error.message);
  }

  // Test 3: Invalid Login
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'wrong@email.com',
      password: 'wrongpassword',
    });
    recordTest('Invalid Login Should Fail', false, 'Should have returned 401');
  } catch (error) {
    if (error.response?.status === 401) {
      recordTest('Invalid Login Should Fail', true);
    } else {
      recordTest('Invalid Login Should Fail', false, `Expected 401, got ${error.response?.status}`);
    }
  }

  // Test 4: Missing Credentials
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
    });
    recordTest('Missing Password Should Fail', false, 'Should have returned 400');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('Missing Password Should Fail', true);
    } else {
      recordTest('Missing Password Should Fail', false, `Expected 400, got ${error.response?.status}`);
    }
  }

  await sleep(500);
}

/**
 * Album Permission Tests
 */

async function testAlbumPermissions() {
  log('Testing Album Permissions', 'section');

  // Test 5: Public - Get All Albums (No Auth Required)
  try {
    const response = await axios.get(`${API_BASE_URL}/albums`);
    if (response.data.success && response.data.data.results) {
      recordTest('Public Access - Get Albums', true);
    } else {
      recordTest('Public Access - Get Albums', false, 'Invalid response structure');
    }
  } catch (error) {
    recordTest('Public Access - Get Albums', false, error.message);
  }

  // Test 6: Public - Get Single Album
  try {
    const listResponse = await axios.get(`${API_BASE_URL}/albums`);
    if (listResponse.data.data.results.length > 0) {
      testAlbumId = listResponse.data.data.results[0]._id;
      const response = await axios.get(`${API_BASE_URL}/albums/${testAlbumId}`);
      if (response.data.success && response.data.data) {
        recordTest('Public Access - Get Single Album', true);
      } else {
        recordTest('Public Access - Get Single Album', false, 'Invalid response');
      }
    } else {
      log('No albums available for testing', 'warning');
      recordTest('Public Access - Get Single Album', false, 'No albums in database');
    }
  } catch (error) {
    recordTest('Public Access - Get Single Album', false, error.message);
  }

  // Test 7: User Cannot Create Album
  try {
    await axios.post(
      `${API_BASE_URL}/albums`,
      {
        title: 'Unauthorized Album',
        artist: 'Test Artist',
        category: '507f1f77bcf86cd799439011',
        releaseYear: 2024,
        price: 19.99,
        stock: 10,
        description: 'Test description',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    recordTest('User Cannot Create Album', false, 'User was able to create album');
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      recordTest('User Cannot Create Album', true);
    } else {
      recordTest('User Cannot Create Album', false, `Expected 403/401, got ${error.response?.status}`);
    }
  }

  // Test 8: Admin Can Create Album
  try {
    // First get a valid category
    const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`);
    if (categoriesResponse.data.data && categoriesResponse.data.data.length > 0) {
      testCategoryId = categoriesResponse.data.data[0]._id;
      
      const response = await axios.post(
        `${API_BASE_URL}/albums`,
        {
          title: 'Test Album by Admin',
          artist: 'Test Artist',
          category: testCategoryId,
          releaseYear: 2024,
          price: 29.99,
          stock: 50,
          description: 'This is a test album created by admin for permission testing',
          images: [{ url: 'https://via.placeholder.com/300', isMain: true }],
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      
      if (response.data.success && response.data.data) {
        testAlbumId = response.data.data._id;
        recordTest('Admin Can Create Album', true);
        log(`Created test album ID: ${testAlbumId}`, 'info');
      } else {
        recordTest('Admin Can Create Album', false, 'Invalid response structure');
      }
    } else {
      recordTest('Admin Can Create Album', false, 'No categories available');
    }
  } catch (error) {
    recordTest('Admin Can Create Album', false, error.response?.data?.message || error.message);
  }

  // Test 9: User Cannot Update Album
  if (testAlbumId) {
    try {
      await axios.put(
        `${API_BASE_URL}/albums/${testAlbumId}`,
        { price: 39.99 },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      recordTest('User Cannot Update Album', false, 'User was able to update album');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        recordTest('User Cannot Update Album', true);
      } else {
        recordTest('User Cannot Update Album', false, `Expected 403/401, got ${error.response?.status}`);
      }
    }
  }

  // Test 10: Admin Can Update Album
  if (testAlbumId) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/albums/${testAlbumId}`,
        { price: 24.99, stock: 100 },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (response.data.success && response.data.data.price === 24.99) {
        recordTest('Admin Can Update Album', true);
      } else {
        recordTest('Admin Can Update Album', false, 'Album not updated correctly');
      }
    } catch (error) {
      recordTest('Admin Can Update Album', false, error.response?.data?.message || error.message);
    }
  }

  // Test 11: User Cannot Delete Album
  if (testAlbumId) {
    try {
      await axios.delete(`${API_BASE_URL}/albums/${testAlbumId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      recordTest('User Cannot Delete Album', false, 'User was able to delete album');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        recordTest('User Cannot Delete Album', true);
      } else {
        recordTest('User Cannot Delete Album', false, `Expected 403/401, got ${error.response?.status}`);
      }
    }
  }

  await sleep(500);
}

/**
 * Category Permission Tests
 */

async function testCategoryPermissions() {
  log('Testing Category Permissions', 'section');

  // Test 12: Public Can View Categories
  try {
    const response = await axios.get(`${API_BASE_URL}/categories`);
    if (response.data.success && Array.isArray(response.data.data)) {
      recordTest('Public Can View Categories', true);
      if (response.data.data.length > 0) {
        testCategoryId = response.data.data[0]._id;
      }
    } else {
      recordTest('Public Can View Categories', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('Public Can View Categories', false, error.message);
  }

  // Test 13: User Cannot Create Category
  try {
    await axios.post(
      `${API_BASE_URL}/categories`,
      { name: 'Unauthorized Category', description: 'Test' },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    recordTest('User Cannot Create Category', false, 'User was able to create category');
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      recordTest('User Cannot Create Category', true);
    } else {
      recordTest('User Cannot Create Category', false, `Expected 403/401, got ${error.response?.status}`);
    }
  }

  // Test 14: Admin Can Create Category
  try {
    const uniqueName = `Test Category ${Date.now()}`;
    const response = await axios.post(
      `${API_BASE_URL}/categories`,
      {
        name: uniqueName,
        description: 'Category created by admin for testing',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (response.data.success && response.data.data) {
      testCategoryId = response.data.data._id;
      recordTest('Admin Can Create Category', true);
      log(`Created test category ID: ${testCategoryId}`, 'info');
    } else {
      recordTest('Admin Can Create Category', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('Admin Can Create Category', false, error.response?.data?.message || error.message);
  }

  // Test 15: User Cannot Update Category
  if (testCategoryId) {
    try {
      await axios.put(
        `${API_BASE_URL}/categories/${testCategoryId}`,
        { description: 'Updated by user' },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      recordTest('User Cannot Update Category', false, 'User was able to update category');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        recordTest('User Cannot Update Category', true);
      } else {
        recordTest('User Cannot Update Category', false, `Expected 403/401, got ${error.response?.status}`);
      }
    }
  }

  // Test 16: Admin Can Update Category
  if (testCategoryId) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/categories/${testCategoryId}`,
        { description: 'Updated by admin' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (response.data.success) {
        recordTest('Admin Can Update Category', true);
      } else {
        recordTest('Admin Can Update Category', false, 'Category not updated');
      }
    } catch (error) {
      recordTest('Admin Can Update Category', false, error.response?.data?.message || error.message);
    }
  }

  await sleep(500);
}

/**
 * Cart Permission Tests
 */

async function testCartPermissions() {
  log('Testing Cart Permissions', 'section');

  // Test 17: User Can Access Own Cart
  try {
    const response = await axios.get(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    
    if (response.data.success && response.data.data) {
      recordTest('User Can Access Own Cart', true);
    } else {
      recordTest('User Can Access Own Cart', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('User Can Access Own Cart', false, error.message);
  }

  // Test 18: User Can Add to Cart
  if (testAlbumId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/cart/items`,
        { albumId: testAlbumId, quantity: 2 },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      if (response.data.success && response.data.data.item) {
        testCartItemId = response.data.data.item._id;
        recordTest('User Can Add to Cart', true);
        log(`Added cart item ID: ${testCartItemId}`, 'info');
      } else {
        recordTest('User Can Add to Cart', false, 'Invalid response');
      }
    } catch (error) {
      recordTest('User Can Add to Cart', false, error.response?.data?.message || error.message);
    }
  }

  // Test 19: User Can Update Cart Item
  if (testCartItemId) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/cart/items/${testCartItemId}`,
        { quantity: 3 },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      if (response.data.success) {
        recordTest('User Can Update Cart Item', true);
      } else {
        recordTest('User Can Update Cart Item', false, 'Invalid response');
      }
    } catch (error) {
      recordTest('User Can Update Cart Item', false, error.response?.data?.message || error.message);
    }
  }

  // Test 20: Admin Can Access Own Cart
  try {
    const response = await axios.get(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success) {
      recordTest('Admin Can Access Own Cart', true);
    } else {
      recordTest('Admin Can Access Own Cart', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('Admin Can Access Own Cart', false, error.message);
  }

  await sleep(500);
}

/**
 * Order Permission Tests
 */

async function testOrderPermissions() {
  log('Testing Order Permissions', 'section');

  // Test 21: User Can Create Order
  try {
    const response = await axios.post(
      `${API_BASE_URL}/orders`,
      {
        paymentMethod: 'credit_card',
        billingInfo: {
          address: 'Test Street 123',
          city: 'TestCity',
          zipCode: '12345',
          phone: '052-1234567',
        },
        totalAmount: 50,
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    
    if (response.data.success && response.data.data) {
      testOrderId = response.data.data._id;
      recordTest('User Can Create Order', true);
      log(`Created test order ID: ${testOrderId}`, 'info');
    } else {
      recordTest('User Can Create Order', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('User Can Create Order', false, error.response?.data?.message || error.message);
  }

  // Test 22: User Can View Own Orders
  try {
    const response = await axios.get(`${API_BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    
    if (response.data.success && Array.isArray(response.data.data)) {
      recordTest('User Can View Own Orders', true);
    } else {
      recordTest('User Can View Own Orders', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('User Can View Own Orders', false, error.message);
  }

  // Test 23: User Cannot Access All Orders
  try {
    await axios.get(`${API_BASE_URL}/orders/admin/all`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    recordTest('User Cannot Access All Orders', false, 'User accessed admin endpoint');
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 404) {
      recordTest('User Cannot Access All Orders', true);
    } else {
      recordTest('User Cannot Access All Orders', false, `Expected 403/404, got ${error.response?.status}`);
    }
  }

  // Test 24: Admin Can View All Orders
  try {
    const response = await axios.get(`${API_BASE_URL}/orders/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success && response.data.data.orders) {
      recordTest('Admin Can View All Orders', true);
      log(`Total orders in system: ${response.data.data.orders.length}`, 'info');
    } else {
      recordTest('Admin Can View All Orders', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('Admin Can View All Orders', false, error.response?.data?.message || error.message);
  }

  // Test 25: User Cannot Update Order Status
  if (testOrderId) {
    try {
      await axios.put(
        `${API_BASE_URL}/orders/${testOrderId}/status`,
        { status: 'shipped' },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      recordTest('User Cannot Update Order Status', false, 'User was able to update status');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 404) {
        recordTest('User Cannot Update Order Status', true);
      } else {
        recordTest('User Cannot Update Order Status', false, `Expected 403/404, got ${error.response?.status}`);
      }
    }
  }

  // Test 26: Admin Can Update Order Status
  if (testOrderId) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/orders/${testOrderId}/status`,
        { status: 'processing' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (response.data.success) {
        recordTest('Admin Can Update Order Status', true);
      } else {
        recordTest('Admin Can Update Order Status', false, 'Status not updated');
      }
    } catch (error) {
      recordTest('Admin Can Update Order Status', false, error.response?.data?.message || error.message);
    }
  }

  // Test 27: Admin Can View Order Statistics
  try {
    const response = await axios.get(`${API_BASE_URL}/orders/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success && response.data.data) {
      recordTest('Admin Can View Order Statistics', true);
      log(`Total revenue: $${response.data.data.totalRevenue}`, 'info');
    } else {
      recordTest('Admin Can View Order Statistics', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('Admin Can View Order Statistics', false, error.response?.data?.message || error.message);
  }

  await sleep(500);
}

/**
 * Wishlist Permission Tests
 */

async function testWishlistPermissions() {
  log('Testing Wishlist Permissions', 'section');

  // Test 28: Guest Cannot Access Wishlist
  try {
    await axios.get(`${API_BASE_URL}/wishlist`);
    recordTest('Guest Cannot Access Wishlist', false, 'Guest accessed wishlist');
  } catch (error) {
    if (error.response?.status === 401) {
      recordTest('Guest Cannot Access Wishlist', true);
    } else {
      recordTest('Guest Cannot Access Wishlist', false, `Expected 401, got ${error.response?.status}`);
    }
  }

  // Test 29: User Can Access Own Wishlist
  try {
    const response = await axios.get(`${API_BASE_URL}/wishlist`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    
    if (response.data.success && Array.isArray(response.data.data)) {
      recordTest('User Can Access Own Wishlist', true);
    } else {
      recordTest('User Can Access Own Wishlist', false, 'Invalid response');
    }
  } catch (error) {
    recordTest('User Can Access Own Wishlist', false, error.message);
  }

  // Test 30: User Can Add to Wishlist
  if (testAlbumId) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/wishlist/${testAlbumId}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      if (response.data.success) {
        recordTest('User Can Add to Wishlist', true);
      } else {
        recordTest('User Can Add to Wishlist', false, 'Invalid response');
      }
    } catch (error) {
      recordTest('User Can Add to Wishlist', false, error.response?.data?.message || error.message);
    }
  }

  // Test 31: User Can Remove from Wishlist
  if (testAlbumId) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/wishlist/${testAlbumId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      
      if (response.data.success) {
        recordTest('User Can Remove from Wishlist', true);
      } else {
        recordTest('User Can Remove from Wishlist', false, 'Invalid response');
      }
    } catch (error) {
      recordTest('User Can Remove from Wishlist', false, error.response?.data?.message || error.message);
    }
  }

  await sleep(500);
}

/**
 * Profile and Authentication Tests
 */

async function testProfilePermissions() {
  log('Testing Profile Permissions', 'section');

  // Test 32: User Can Access Own Profile
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    
    if (response.data.success && response.data.data.email === USER_EMAIL) {
      recordTest('User Can Access Own Profile', true);
    } else {
      recordTest('User Can Access Own Profile', false, 'Wrong profile returned');
    }
  } catch (error) {
    recordTest('User Can Access Own Profile', false, error.message);
  }

  // Test 33: Admin Can Access Own Profile
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    
    if (response.data.success && response.data.data.email === ADMIN_EMAIL) {
      recordTest('Admin Can Access Own Profile', true);
    } else {
      recordTest('Admin Can Access Own Profile', false, 'Wrong profile returned');
    }
  } catch (error) {
    recordTest('Admin Can Access Own Profile', false, error.message);
  }

  // Test 34: Invalid Token Should Fail
  try {
    await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    recordTest('Invalid Token Should Fail', false, 'Invalid token accepted');
  } catch (error) {
    if (error.response?.status === 401) {
      recordTest('Invalid Token Should Fail', true);
    } else {
      recordTest('Invalid Token Should Fail', false, `Expected 401, got ${error.response?.status}`);
    }
  }

  await sleep(500);
}

/**
 * Edge Cases and Security Tests
 */

async function testEdgeCasesAndSecurity() {
  log('Testing Edge Cases and Security', 'section');

  // Test 35: SQL Injection Attempt in Login
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "admin' OR '1'='1",
      password: "anything",
    });
    recordTest('SQL Injection Prevention', false, 'SQL injection succeeded');
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 400) {
      recordTest('SQL Injection Prevention', true);
    } else {
      recordTest('SQL Injection Prevention', false, 'Unexpected response');
    }
  }

  // Test 36: XSS Attempt in Album Creation
  try {
    await axios.post(
      `${API_BASE_URL}/albums`,
      {
        title: '<script>alert("XSS")</script>',
        artist: 'Test',
        category: testCategoryId,
        releaseYear: 2024,
        price: 10,
        stock: 5,
        description: 'Test',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    // Should sanitize but not fail
    recordTest('XSS Input Handling', true);
  } catch (error) {
    recordTest('XSS Input Handling', false, error.response?.data?.message || error.message);
  }

  // Test 37: Extremely Long Input
  try {
    await axios.post(
      `${API_BASE_URL}/albums`,
      {
        title: 'A'.repeat(1000),
        artist: 'Test',
        category: testCategoryId,
        releaseYear: 2024,
        price: 10,
        stock: 5,
        description: 'Test',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    recordTest('Long Input Validation', false, 'Should reject very long input');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('Long Input Validation', true);
    } else {
      recordTest('Long Input Validation', false, `Expected 400, got ${error.response?.status}`);
    }
  }

  // Test 38: Negative Price
  try {
    await axios.post(
      `${API_BASE_URL}/albums`,
      {
        title: 'Negative Price Album',
        artist: 'Test',
        category: testCategoryId,
        releaseYear: 2024,
        price: -10,
        stock: 5,
        description: 'Test',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    recordTest('Negative Price Validation', false, 'Accepted negative price');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('Negative Price Validation', true);
    } else {
      recordTest('Negative Price Validation', false, `Expected 400, got ${error.response?.status}`);
    }
  }

  // Test 39: Future Release Year
  try {
    await axios.post(
      `${API_BASE_URL}/albums`,
      {
        title: 'Future Album',
        artist: 'Test',
        category: testCategoryId,
        releaseYear: 2050,
        price: 10,
        stock: 5,
        description: 'Test',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    recordTest('Future Year Validation', false, 'Accepted future year');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('Future Year Validation', true);
    } else {
      recordTest('Future Year Validation', false, `Expected 400, got ${error.response?.status}`);
    }
  }

  // Test 40: Missing Required Fields
  try {
    await axios.post(
      `${API_BASE_URL}/albums`,
      {
        title: 'Incomplete Album',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    recordTest('Required Fields Validation', false, 'Accepted incomplete data');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('Required Fields Validation', true);
    } else {
      recordTest('Required Fields Validation', false, `Expected 400, got ${error.response?.status}`);
    }
  }

  await sleep(500);
}

/**
 * Cleanup Function
 */

async function cleanup() {
  log('Cleaning Up Test Data', 'section');

  // Delete test album
  if (testAlbumId) {
    try {
      await axios.delete(`${API_BASE_URL}/albums/${testAlbumId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      log('Deleted test album', 'success');
    } catch (error) {
      log(`Failed to delete test album: ${error.message}`, 'warning');
    }
  }

  // Delete test category
  if (testCategoryId) {
    try {
      await axios.delete(`${API_BASE_URL}/categories/${testCategoryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      log('Deleted test category', 'success');
    } catch (error) {
      log(`Failed to delete test category: ${error.message}`, 'warning');
    }
  }

  // Clear user cart
  if (userToken) {
    try {
      await axios.delete(`${API_BASE_URL}/cart`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      log('Cleared user cart', 'success');
    } catch (error) {
      log(`Failed to clear cart: ${error.message}`, 'warning');
    }
  }
}

/**
 * Print Final Results
 */

function printResults() {
  log('Test Results Summary', 'header');
  
  console.log(chalk.white(`\nTotal Tests: ${results.total}`));
  console.log(chalk.green(`Passed: ${results.passed}`));
  console.log(chalk.red(`Failed: ${results.failed}`));
  console.log(chalk.yellow(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%\n`));

  if (results.failed > 0) {
    log('Failed Tests Details:', 'section');
    results.errors.forEach((err, index) => {
      console.log(chalk.red(`${index + 1}. ${err.test}`));
      console.log(chalk.gray(`   ${err.error}\n`));
    });
  }

  if (results.passed === results.total) {
    log('🎉 All tests passed successfully!', 'success');
  } else {
    log(`⚠️  ${results.failed} test(s) failed. Please review the errors above.`, 'warning');
  }
}

/**
 * Main Execution Function
 */

async function runTests() {
  log('Music Store - Permission Testing Suite', 'header');
  log(`Testing API at: ${API_BASE_URL}`, 'info');
  log(`Start Time: ${new Date().toLocaleString()}\n`, 'info');

  try {
    await testAuthentication();
    
    if (!adminToken || !userToken) {
      log('Authentication failed. Cannot proceed with tests.', 'error');
      process.exit(1);
    }

    await testAlbumPermissions();
    await testCategoryPermissions();
    await testCartPermissions();
    await testOrderPermissions();
    await testWishlistPermissions();
    await testProfilePermissions();
    await testEdgeCasesAndSecurity();
    
    await cleanup();
    
    printResults();
    
    log(`\nEnd Time: ${new Date().toLocaleString()}`, 'info');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();