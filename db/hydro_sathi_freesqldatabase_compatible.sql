-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 26, 2026 at 10:46 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hydro_sathi`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `actor_id` bigint(20) UNSIGNED DEFAULT NULL,
  `actor_role` enum('BUYER','SELLER','ADMIN','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(60) NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, NULL, 'BUYER', 'USER_REGISTERED', 'users', 4, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 03:06:55'),
(2, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 03:40:19'),
(3, NULL, 'BUYER', 'USER_REGISTERED', 'users', 5, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 20:35:13'),
(4, NULL, 'BUYER', 'USER_REGISTERED', 'users', 6, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 20:46:58'),
(5, NULL, 'BUYER', 'USER_REGISTERED', 'users', 7, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 20:58:46'),
(6, NULL, 'BUYER', 'EMAIL_VERIFIED', 'users', 7, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 20:59:29'),
(7, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 21:01:02'),
(8, NULL, 'BUYER', 'USER_LOGIN', 'users', 7, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-06 21:05:22'),
(9, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::ffff:127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-07 01:16:50'),
(10, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-07 01:37:21'),
(11, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-07 03:04:53'),
(12, 1, 'ADMIN', 'CATEGORY_CREATED', 'categories', 9, NULL, '{\"name\":\"check\",\"parentId\":null,\"sortOrder\":0}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-07 03:05:37'),
(13, 1, 'ADMIN', 'PRODUCT_CREATED', 'products', 5, NULL, '{\"name\":\"Screw\",\"partNumber\":\"HS-BFV-8349\",\"oemNumber\":\"2389\",\"categoryId\":2,\"unit\":\"pcs\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-07 03:07:07'),
(14, NULL, 'BUYER', 'USER_REGISTERED', 'users', 9, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-07 03:09:12'),
(15, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 16:48:24'),
(16, 1, 'ADMIN', 'PRODUCT_CREATED', 'products', 6, NULL, '{\"name\":\"Screw\",\"partNumber\":\"2341\",\"oemNumber\":\"453\",\"categoryId\":1,\"manufacturer\":\"dont know\",\"shortDescription\":\"hello guys\",\"unit\":\"pcs\",\"images\":[{\"url\":\"http://localhost:4000/uploads/1789125677486-za79395vahg.jpg\",\"isPrimary\":true}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 16:51:17'),
(17, 1, 'ADMIN', 'PRODUCT_ASSIGNED', 'seller_listings', 4, NULL, '{\"sellerId\":1,\"price\":2345,\"stockQuantity\":7,\"minOrderQty\":1,\"leadTimeDays\":3,\"conditionType\":\"NEW\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 16:59:13'),
(18, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 17:08:34'),
(19, 3, 'SELLER', 'PRODUCT_SUBMITTED', 'products', 7, NULL, '{\"name\":\"king of the ring\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 17:10:38'),
(20, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 17:11:16'),
(21, 1, 'ADMIN', 'PRODUCT_REVIEWED', 'products', 7, NULL, '{\"status\":\"REJECTED\",\"reason\":\"not good\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 17:11:51'),
(22, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 17:12:13'),
(23, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-11 17:14:05'),
(24, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0', '2026-09-13 02:43:17'),
(25, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0', '2026-09-13 02:48:21'),
(26, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 20:58:52'),
(27, 1, 'ADMIN', 'PRODUCT_CREATED', 'products', 8, NULL, '{\"name\":\"nail\",\"partNumber\":\"82374\",\"oemNumber\":\"234234\",\"categoryId\":2,\"brandId\":2,\"manufacturer\":\"t and t s\",\"shortDescription\":\"laskdfjoijiwenfon\",\"unit\":\"pcs\",\"images\":[{\"url\":\"http://localhost:4000/uploads/1789313457236-488p78socqy.jpg\",\"isPrimary\":true},{\"url\":\"http://localhost:4000/uploads/1789313457241-fvw6a9f2x8c.png\",\"isPrimary\":false},{\"url\":\"http://localhost:4000/uploads/1789313457241-azild2t4wyg.jpg\",\"isPrimary\":false},{\"url\":\"http://localhost:4000/uploads/1789313457256-tfkwemf0z3.png\",\"isPrimary\":false}]}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:00:57'),
(28, 1, 'ADMIN', 'PRODUCT_ASSIGNED', 'seller_listings', 6, NULL, '{\"sellerId\":1,\"price\":660,\"stockQuantity\":500,\"minOrderQty\":1,\"leadTimeDays\":3,\"conditionType\":\"NEW\"}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:01:38'),
(29, 1, 'ADMIN', 'CATEGORY_CREATED', 'categories', 10, NULL, '{\"name\":\"screws\",\"parentId\":2,\"sortOrder\":0}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:04:29'),
(30, 1, 'ADMIN', 'COMMISSION_SETTING_CREATED', 'commission_settings', 4, NULL, '{\"scopeType\":\"SELLER\",\"scopeId\":1,\"rate\":10}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:11:48'),
(31, 1, 'ADMIN', 'COMMISSION_SETTING_CREATED', 'commission_settings', 5, NULL, '{\"scopeType\":\"SELLER\",\"scopeId\":1,\"rate\":8}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:11:59'),
(32, 1, 'ADMIN', 'COMMISSION_SETTING_CREATED', 'commission_settings', 6, NULL, '{\"scopeType\":\"SELLER\",\"scopeId\":1,\"rate\":9}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:12:21'),
(33, 1, 'ADMIN', 'COMMISSION_SETTING_CREATED', 'commission_settings', 7, NULL, '{\"scopeType\":\"GLOBAL\",\"rate\":8}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-13 21:12:58'),
(34, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 11:24:32'),
(35, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0', '2026-09-16 11:28:00'),
(36, 1, 'ADMIN', 'SUPPORT_TICKET_UPDATED', 'support_tickets', 5, NULL, '{\"status\":\"IN_PROGRESS\",\"replied\":true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0', '2026-09-16 11:48:35'),
(37, NULL, 'BUYER', 'USER_REGISTERED', 'users', 18, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-16 11:49:32'),
(38, 19, 'BUYER', 'USER_REGISTERED', 'users', 19, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-20 20:53:11'),
(39, 19, 'BUYER', 'EMAIL_VERIFIED', 'users', 19, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-20 20:54:01'),
(40, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-20 20:55:53'),
(41, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-20 20:58:37'),
(42, 1, 'ADMIN', 'SUPPORT_TICKET_UPDATED', 'support_tickets', 6, NULL, '{\"status\":\"IN_PROGRESS\",\"replied\":true}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-20 21:01:11'),
(43, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-20 21:02:36'),
(44, 3, 'SELLER', 'USER_LOGIN', 'users', 3, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-27 01:32:55'),
(45, 21, 'SELLER', 'USER_REGISTERED', 'users', 21, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-27 01:39:01'),
(46, 1, 'ADMIN', 'ADMIN_LOGIN', 'users', 1, NULL, NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-27 01:46:17'),
(47, 1, 'ADMIN', 'COMMISSION_SETTING_CREATED', 'commission_settings', 8, NULL, '{\"scopeType\":\"SELLER\",\"scopeId\":2,\"rate\":5}', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '2026-09-27 01:47:21');

-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE `brands` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `brands`
--

INSERT INTO `brands` (`id`, `name`, `slug`, `logo_url`, `created_at`) VALUES
(1, 'Andritz Hydro', 'andritz-hydro', NULL, '2026-08-24 16:06:36'),
(2, 'Voith', 'voith', NULL, '2026-08-24 16:06:36'),
(3, 'SKF', 'skf', NULL, '2026-08-24 16:06:36');

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `listing_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ;

--
-- Dumping data for table `cart_items`
--

INSERT INTO `cart_items` (`id`, `user_id`, `listing_id`, `quantity`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2026-09-11 16:56:43', '2026-09-11 16:56:43'),
(3, 19, 1, 2, '2026-09-20 20:54:14', '2026-09-20 20:54:32'),
(4, 3, 1, 3, '2026-09-20 20:55:53', '2026-09-20 21:02:36');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `icon` varchar(60) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `parent_id`, `name`, `slug`, `description`, `icon`, `image_url`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Turbine Components', 'turbine-components', NULL, NULL, NULL, 1, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(2, NULL, 'Valves & Gates', 'valves-gates', NULL, NULL, NULL, 2, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(3, NULL, 'Bearings & Seals', 'bearings-seals', NULL, NULL, NULL, 3, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(4, NULL, 'Pumps', 'pumps', NULL, NULL, NULL, 4, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(5, NULL, 'Electrical & Control', 'electrical-control', NULL, NULL, NULL, 5, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(6, 1, 'Pelton Buckets', 'pelton-buckets', NULL, NULL, NULL, 1, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(7, 2, 'Butterfly Valves', 'butterfly-valves', NULL, NULL, NULL, 1, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(8, 3, 'Mechanical Seals', 'mechanical-seals', NULL, NULL, NULL, 1, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36'),
(9, NULL, 'check', 'check', NULL, NULL, NULL, 0, 0, '2026-09-07 03:05:37', '2026-09-07 03:06:01'),
(10, 2, 'screws', 'screws', NULL, NULL, NULL, 0, 1, '2026-09-13 21:04:29', '2026-09-13 21:04:29');

-- --------------------------------------------------------

--
-- Table structure for table `commission_records`
--

CREATE TABLE `commission_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `order_item_id` bigint(20) UNSIGNED NOT NULL,
  `seller_id` bigint(20) UNSIGNED NOT NULL,
  `gross_amount` decimal(12,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `seller_amount` decimal(12,2) NOT NULL,
  `status` enum('ACCRUED','REVERSED','SETTLED') NOT NULL DEFAULT 'ACCRUED',
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commission_settings`
--

CREATE TABLE `commission_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `scope_type` enum('GLOBAL','CATEGORY','SELLER') NOT NULL,
  `scope_id` bigint(20) UNSIGNED DEFAULT NULL,
  `rate` decimal(5,2) NOT NULL,
  `effective_from` datetime NOT NULL,
  `effective_to` datetime DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL
) ;

--
-- Dumping data for table `commission_settings`
--

INSERT INTO `commission_settings` (`id`, `scope_type`, `scope_id`, `rate`, `effective_from`, `effective_to`, `created_by`, `created_at`) VALUES
(1, 'GLOBAL', NULL, 10.00, '2026-08-24 16:06:37', '2026-09-13 21:12:58', 1, '2026-08-24 16:06:37'),
(2, 'CATEGORY', 1, 8.00, '2026-08-24 16:06:37', NULL, 1, '2026-08-24 16:06:37'),
(3, 'SELLER', 1, 10.00, '2026-08-24 16:06:37', '2026-09-13 21:11:48', 1, '2026-08-24 16:06:37'),
(4, 'SELLER', 1, 10.00, '2026-09-13 21:11:48', '2026-09-13 21:11:59', 1, '2026-09-13 21:11:48'),
(5, 'SELLER', 1, 8.00, '2026-09-13 21:11:59', '2026-09-13 21:12:20', 1, '2026-09-13 21:11:59'),
(6, 'SELLER', 1, 9.00, '2026-09-13 21:12:20', NULL, 1, '2026-09-13 21:12:20'),
(7, 'GLOBAL', NULL, 8.00, '2026-09-13 21:12:58', NULL, 1, '2026-09-13 21:12:58'),
(8, 'SELLER', 2, 5.00, '2026-09-27 01:47:21', NULL, 1, '2026-09-27 01:47:21');

-- --------------------------------------------------------

--
-- Table structure for table `email_verifications`
--

CREATE TABLE `email_verifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_verifications`
--

INSERT INTO `email_verifications` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`) VALUES
(14, 19, '23dd652b2c32cfe96cfe1d18640685a7b41baf3e2f89ac08aee7a6f33955902f', '2026-09-21 20:53:08', '2026-09-20 20:54:01', '2026-09-20 20:53:08'),
(15, 21, '5f98786ca5a48393fe7dce09ec90ce750f56369f2c028621211c793d96d0622a', '2026-09-28 01:39:01', NULL, '2026-09-27 01:39:01');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `audience` enum('USER','SELLER','ADMIN') NOT NULL DEFAULT 'USER',
  `type` varchar(60) NOT NULL,
  `title` varchar(160) NOT NULL,
  `message` varchar(500) NOT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `audience`, `type`, `title`, `message`, `link_url`, `is_read`, `created_at`) VALUES
(1, 3, 'SELLER', 'PRODUCT_ASSIGNED', 'Product assigned to your shop', 'Screw is now listed under your shop.', '/seller/products', 0, '2026-09-11 16:59:13'),
(2, NULL, 'ADMIN', 'PRODUCT_SUBMITTED', 'Product awaiting approval', 'Himalaya Hydro Supplies submitted “king of the ring”.', '/admin/products', 0, '2026-09-11 17:10:38'),
(3, 3, 'SELLER', 'PRODUCT_REVIEWED', 'Product rejected', 'king of the ring was rejected.', '/seller/products', 0, '2026-09-11 17:11:51'),
(4, 3, 'SELLER', 'PRODUCT_ASSIGNED', 'Product assigned to your shop', 'nail is now listed under your shop.', '/seller/products', 0, '2026-09-13 21:01:38'),
(5, 3, 'SELLER', 'SUPPORT_REPLY', 'Support reply — HS-SUP-MU3OTL1R', 'iwill solve', '/support', 0, '2026-09-16 11:48:35'),
(6, NULL, 'ADMIN', 'SUPPORT_TICKET', 'Support request HS-SUP-MU9Z03E7', 'Sagar Thapa: Incorrect billing after account cancellation request – Invoice #3131668 (February 2026)', '/admin/support', 0, '2026-09-20 20:57:54'),
(7, 3, 'SELLER', 'SUPPORT_REPLY', 'Support reply — HS-SUP-MU9Z03E7', 'we will see', '/support', 0, '2026-09-20 21:01:11'),
(8, NULL, 'ADMIN', 'SELLER_REGISTERED', 'New seller application', 'parts and parts applied for a seller account.', '/admin/sellers', 0, '2026-09-27 01:39:01');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_number` varchar(32) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `buyer_name` varchar(120) NOT NULL,
  `buyer_phone` varchar(20) NOT NULL,
  `buyer_email` varchar(190) NOT NULL,
  `shipping_province` varchar(60) NOT NULL,
  `shipping_district` varchar(60) NOT NULL,
  `shipping_city` varchar(80) NOT NULL,
  `shipping_street` varchar(190) NOT NULL,
  `shipping_landmark` varchar(190) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `tax_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_charge` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `seller_payable` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` char(3) NOT NULL DEFAULT 'NPR',
  `payment_status` enum('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  `order_status` enum('PLACED','PAYMENT_CONFIRMED','SELLER_CONFIRMED','ADMIN_APPROVED','SHIPPED','DELIVERED','COMPLETED','CANCELLED','ON_HOLD','REFUNDED') NOT NULL DEFAULT 'PLACED',
  `tracking_number` varchar(80) DEFAULT NULL,
  `courier_name` varchar(120) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `placed_at` datetime NOT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `listing_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `seller_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_name_snapshot` varchar(190) NOT NULL,
  `part_number_snapshot` varchar(80) NOT NULL,
  `seller_name_snapshot` varchar(160) NOT NULL,
  `image_url_snapshot` varchar(255) DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `seller_amount` decimal(12,2) NOT NULL,
  `item_status` enum('PENDING','CONFIRMED','UNAVAILABLE','SHIPPED','DELIVERED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `order_status_history`
--

CREATE TABLE `order_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `status` varchar(40) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `changed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `provider` enum('ESEWA','KHALTI','BANK_TRANSFER','COD') NOT NULL,
  `transaction_type` enum('PAYMENT','REFUND') NOT NULL DEFAULT 'PAYMENT',
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'NPR',
  `provider_txn_id` varchar(120) DEFAULT NULL,
  `provider_ref_id` varchar(120) DEFAULT NULL,
  `status` enum('INITIATED','PENDING','SUCCESS','FAILED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `verified_server_side` tinyint(1) NOT NULL DEFAULT 0,
  `raw_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `failure_reason` varchar(255) DEFAULT NULL,
  `initiated_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `brand_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(190) NOT NULL,
  `slug` varchar(210) NOT NULL,
  `part_number` varchar(80) NOT NULL,
  `oem_number` varchar(80) DEFAULT NULL,
  `manufacturer` varchar(120) DEFAULT NULL,
  `short_description` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `specifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `compatibility` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'pcs',
  `weight_kg` decimal(10,3) DEFAULT NULL,
  `hs_code` varchar(20) DEFAULT NULL,
  `status` enum('DRAFT','PENDING_REVIEW','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'PENDING_REVIEW',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_new_arrival` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by_seller_id` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `brand_id`, `name`, `slug`, `part_number`, `oem_number`, `manufacturer`, `short_description`, `description`, `specifications`, `compatibility`, `unit`, `weight_kg`, `hs_code`, `status`, `is_featured`, `is_new_arrival`, `created_by`, `created_by_seller_id`, `approved_by`, `approved_at`, `rejection_reason`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 6, 1, 'Pelton Turbine Bucket – 2 MW', 'pelton-turbine-bucket-2mw', 'HS-PLT-2001', 'AH-PB-2001', 'Andritz Hydro', 'Cast stainless steel Pelton bucket for 2 MW runners.', NULL, NULL, NULL, 'pcs', NULL, NULL, 'ACTIVE', 0, 0, 1, NULL, 1, '2026-08-24 16:06:36', NULL, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(2, 7, 2, 'Butterfly Valve DN600 PN16', 'butterfly-valve-dn600-pn16', 'HS-BFV-0600', 'VO-BF-600', 'Voith', 'Ductile iron body butterfly valve with EPDM seat.', NULL, NULL, NULL, 'pcs', NULL, NULL, 'ACTIVE', 0, 0, 1, NULL, 1, '2026-08-24 16:06:36', NULL, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(3, 8, 3, 'Mechanical Seal 120 mm SiC', 'mechanical-seal-120mm-sic', 'HS-MSL-0120', 'SKF-MS-120', 'SKF', 'Silicon carbide mechanical seal for turbine shafts.', NULL, NULL, NULL, 'pcs', NULL, NULL, 'ACTIVE', 0, 0, 1, NULL, 1, '2026-08-24 16:06:36', NULL, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(6, 1, NULL, 'Screw', 'screw-mtwv8fym', '2341', '453', 'dont know', 'hello guys', NULL, NULL, NULL, 'pcs', NULL, NULL, 'ACTIVE', 0, 0, 1, NULL, 1, '2026-09-11 16:51:17', NULL, '2026-09-11 16:51:17', '2026-09-11 16:51:17', NULL),
(7, 5, NULL, 'king of the ring', 'king-of-the-ring-mtwvxc0j', '2398', '9342', 'domsday', 'so good', NULL, NULL, '[\"akdfnlkjien\"]', 'pcs', NULL, NULL, 'ARCHIVED', 0, 0, 3, 1, 1, NULL, 'not good', '2026-09-11 17:10:38', '2026-09-11 17:11:51', NULL),
(8, 2, 2, 'nail', 'nail-mtzz17sa', '82374', '234234', 't and t s', 'laskdfjoijiwenfon', NULL, NULL, NULL, 'pcs', NULL, NULL, 'ACTIVE', 0, 0, 1, NULL, 1, '2026-09-13 21:00:57', NULL, '2026-09-13 21:00:57', '2026-09-13 21:00:57', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `alt_text` varchar(190) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image_url`, `alt_text`, `sort_order`, `is_primary`, `created_at`) VALUES
(1, 1, '/images/part-turbine.jpg', 'Pelton turbine bucket', 0, 1, '2026-08-24 16:06:36'),
(2, 1, '/images/part-turbine-2.jpg', 'Pelton bucket profile', 1, 0, '2026-08-24 16:06:36'),
(3, 2, '/images/part-valve.jpg', 'Butterfly valve DN600', 0, 1, '2026-08-24 16:06:36'),
(4, 2, '/images/part-valve-2.jpg', 'Butterfly valve flange', 1, 0, '2026-08-24 16:06:36'),
(5, 3, '/images/part-seal.jpg', 'Mechanical seal 120 mm', 0, 1, '2026-08-24 16:06:36'),
(6, 6, 'http://localhost:4000/uploads/1789125677486-za79395vahg.jpg', 'Screw', 0, 1, '2026-09-11 16:51:17'),
(7, 7, 'http://localhost:4000/uploads/1789126838756-moroxf0u588.jpg', 'king of the ring', 0, 1, '2026-09-11 17:10:38'),
(8, 8, 'http://localhost:4000/uploads/1789313457236-488p78socqy.jpg', 'nail', 0, 1, '2026-09-13 21:00:57'),
(9, 8, 'http://localhost:4000/uploads/1789313457241-fvw6a9f2x8c.png', 'nail', 1, 0, '2026-09-13 21:00:57'),
(10, 8, 'http://localhost:4000/uploads/1789313457241-azild2t4wyg.jpg', 'nail', 2, 0, '2026-09-13 21:00:57'),
(11, 8, 'http://localhost:4000/uploads/1789313457256-tfkwemf0z3.png', 'nail', 3, 0, '2026-09-13 21:00:57');

-- --------------------------------------------------------

--
-- Table structure for table `product_reviews`
--

CREATE TABLE `product_reviews` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `order_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `title` varchar(160) DEFAULT NULL,
  `body` varchar(2000) DEFAULT NULL,
  `status` enum('PENDING','PUBLISHED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `family_id` char(36) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `rotated_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`id`, `user_id`, `family_id`, `token_hash`, `user_agent`, `ip_address`, `expires_at`, `rotated_at`, `revoked_at`, `replaced_by`, `created_at`) VALUES
(1, 1, '81adc756-72e2-485f-8a29-e838701a1671', '4754e8bbeea7b42237a51b3476f4a237269abacc3651031e43fa11b48dfd3312', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-06 03:40:19', '2026-09-06 20:32:01', NULL, 2, '2026-09-06 03:40:19'),
(2, 1, '81adc756-72e2-485f-8a29-e838701a1671', 'd0e85f8128d58f4768fd274e3cdb8a7560fceb940fad6a98ad11bb19ce2c3ba1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-06 20:32:01', NULL, '2026-09-06 20:34:30', NULL, '2026-09-06 20:32:01'),
(4, 1, '03029fd9-a81f-47b9-af4e-fe6bd30142f6', '460ff7e4323868dd0b589e961e4d8f1f3c828067e03a8e7267b7e2649003005a', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-06 21:01:02', NULL, NULL, NULL, '2026-09-06 21:01:02'),
(6, 1, 'cb055cbd-83ea-4604-bb5e-a7e6659ec414', '5f65536ded6c8360bfbfd760bb436c8e3dae10022bea8ef684b6706add1b32de', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::ffff:127.0.0.1', '2026-10-07 01:16:50', NULL, '2026-09-07 01:23:30', NULL, '2026-09-07 01:16:50'),
(7, 1, '774a4917-7d11-43e7-97f9-6a9ffba258a0', '5fc984d218e5333f1d1de2c0076c94487386d0c343e24f1bb5dbd6574afa843e', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-07 01:37:21', NULL, NULL, NULL, '2026-09-07 01:37:21'),
(8, 1, '37889675-f65b-4164-a80f-1ae86692d1c8', '954282b3b2dec15c7f16531b7aac7e9dcef3f7e12156cf3638c48d1cb10ced5b', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-07 03:04:53', '2026-09-07 11:30:07', NULL, 9, '2026-09-07 03:04:53'),
(9, 1, '37889675-f65b-4164-a80f-1ae86692d1c8', '17fb84d96fc6856c1d8c938561e70def4a3eca148ed20980d9d7a33b2481ce3a', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-07 11:30:07', NULL, NULL, NULL, '2026-09-07 11:30:07'),
(10, 1, 'fd0f2026-9418-4fc9-8d21-5ca73d9fcd7e', '49cf929cc1dc691cbe439b61cc33382b3df7b81f5c30dfb742495b30b3a7b8f6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-11 16:48:24', NULL, '2026-09-11 17:01:47', NULL, '2026-09-11 16:48:24'),
(11, 3, 'd6c46393-bd00-4aed-b066-8cf98a1b91c1', 'ffb16d09cd62b8cd355db0f36bccc1d079621894c964115157792ad8b21298c0', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-11 17:08:34', NULL, '2026-09-11 17:11:03', NULL, '2026-09-11 17:08:34'),
(12, 1, '26557574-0c5f-484c-be6f-74d1a9e17051', 'f75268da8b22ee4e0b8b2acc0aa0223bba3eae8e1c341998375570cc66d65aac', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-11 17:11:16', NULL, NULL, NULL, '2026-09-11 17:11:16'),
(13, 3, '632d6b96-7ff5-461e-9871-ee85fdcf8110', 'df40de8443589223e7c1bfbfd9ce0d4f1c72fb89fa66cfb953c2e7ea9892597d', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-11 17:12:13', NULL, NULL, NULL, '2026-09-11 17:12:13'),
(14, 1, 'ce71cd69-e019-406e-b94a-e27213c8b7ea', 'c927914f3967d35b8f7c156e073aad175c0a42eeb12d00bcc3d851e06b70778d', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-11 17:14:05', NULL, '2026-09-11 17:18:58', NULL, '2026-09-11 17:14:05'),
(15, 1, 'c7c8eafa-dc68-40f2-ac6b-158ca4f25215', 'ed0da328c445eb6e87d66a29f0d26f2a8807ab5ddb2950479b5aa77b441b833e', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0', '::1', '2026-10-13 02:43:17', NULL, '2026-09-13 02:46:29', NULL, '2026-09-13 02:43:17'),
(16, 3, '9f5fefda-d438-4534-abde-96ceb7e714c1', 'c1398416a165d00f3540d13467b7843d5fd7003cc948092ce22f555d6ed8ac5e', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0', '::1', '2026-10-13 02:48:21', '2026-09-13 21:02:06', NULL, 18, '2026-09-13 02:48:21'),
(17, 1, '8c9f6900-126c-4728-9fba-1fb4130e5b6a', '9b97703e4c5c4e9f1c1bde4c6589d2547b990c9025d51de78fb6f6201ef2766c', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-13 20:58:52', '2026-09-13 21:14:47', NULL, 19, '2026-09-13 20:58:52'),
(18, 3, '9f5fefda-d438-4534-abde-96ceb7e714c1', '43f877bc789b964d6b0ae1deb565b30181736da20079022367b7ac4fe372da3f', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0', '::1', '2026-10-13 21:02:06', NULL, '2026-09-13 21:02:41', NULL, '2026-09-13 21:02:06'),
(19, 1, '8c9f6900-126c-4728-9fba-1fb4130e5b6a', '46f5f4aa5b1b5ee7706046f2167d7fdb48645ce25cf0589ef5be6cac92c71aa6', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-13 21:14:47', '2026-09-16 11:17:01', NULL, 20, '2026-09-13 21:14:47'),
(20, 1, '8c9f6900-126c-4728-9fba-1fb4130e5b6a', '2e1066e14e5d2f07e5aa68047cdb546a00854a32d0877f09a4a7bacccea8b953', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::ffff:127.0.0.1', '2026-10-16 11:17:00', NULL, '2026-09-16 11:22:15', NULL, '2026-09-16 11:17:00'),
(21, 3, 'fbf8027d-9421-435d-af73-d5cad5cc3b3a', '3f1f83bfc5e2d37a59b0883443dff6378fa016244da2214de646c1e98ec040ca', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-16 11:24:32', '2026-09-16 11:39:49', NULL, 23, '2026-09-16 11:24:32'),
(22, 1, 'f41a3280-f4e9-4ee6-bd89-f65bed8dab43', '057ed56b78b7daa871d4b220dcdc04e3fcfb5e2c9ac803ec452771ac348c83c0', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0', '::1', '2026-10-16 11:28:00', '2026-09-16 11:48:22', NULL, 24, '2026-09-16 11:28:00'),
(23, 3, 'fbf8027d-9421-435d-af73-d5cad5cc3b3a', '42365d6d3df089fe28416fd696414e9c89fa9576d16260c7eed78800f2216d2d', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-16 11:39:49', NULL, '2026-09-16 11:49:11', NULL, '2026-09-16 11:39:49'),
(24, 1, 'f41a3280-f4e9-4ee6-bd89-f65bed8dab43', '4554cc48b56870f802abc28ec77db440bb219c9163120bd9132c7e1d1fe6693b', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0', '::1', '2026-10-16 11:48:22', NULL, NULL, NULL, '2026-09-16 11:48:22'),
(25, 19, '2d96f2df-eb04-4f12-9823-c6803d05f539', 'b7294cacd639bd7cacbb4dd5f547ebde68f6a75591f1c417bddc01ecd7e0ba4e', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-20 20:54:01', NULL, NULL, NULL, '2026-09-20 20:54:01'),
(26, 3, 'f8e9ca5b-a277-439c-bf20-287a2013981b', '8e0ab296eb20427d66a2beb8ced2882370e148abee20f2a538041f14b2088b4c', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-20 20:55:53', NULL, NULL, NULL, '2026-09-20 20:55:53'),
(27, 1, '15376c5e-f3e7-4a8f-acef-37fac3131055', '1b9ea185995ebae113e3075dc7a4b83b2cd5237e8163b2e9cd0cee3ad89c8fce', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-20 20:58:37', NULL, NULL, NULL, '2026-09-20 20:58:37'),
(28, 3, 'cf4a5c19-2589-4297-a255-f6a326e3e30f', 'd08ae5d8dde4cc574e768c33d62983d5f857e13fe6f05f8ac6e3cf21bbe91bae', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-20 21:02:36', NULL, '2026-09-20 21:03:34', NULL, '2026-09-20 21:02:36'),
(29, 3, 'f0f60641-6893-491f-9917-a83578e39b2f', '2752e90f22c1e2957815dac7025dc0b4e28147a0416abdf828aa3e7cc17f6176', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-27 01:32:55', NULL, '2026-09-27 01:35:47', NULL, '2026-09-27 01:32:55'),
(30, 1, 'b1d0bf1f-ec78-4ae0-86d5-7337992203c4', '8c33ca169ba94f54b82bdccc2518a90acb5e55840c5e750d3b8e0f24e2ca9176', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-27 01:46:17', '2026-09-27 02:11:26', NULL, 31, '2026-09-27 01:46:17'),
(31, 1, 'b1d0bf1f-ec78-4ae0-86d5-7337992203c4', 'bfd74a8b6b98a219957130b0e75ad7883b1e8279202ec66e33aa8eb67c0f1166', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36', '::1', '2026-10-27 02:11:26', NULL, NULL, NULL, '2026-09-27 02:11:26');

-- --------------------------------------------------------

--
-- Table structure for table `refunds`
--

CREATE TABLE `refunds` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `order_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `status` enum('REQUESTED','APPROVED','REJECTED','PROCESSED') NOT NULL DEFAULT 'REQUESTED',
  `requested_by` bigint(20) UNSIGNED DEFAULT NULL,
  `processed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sellers`
--

CREATE TABLE `sellers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `business_name` varchar(160) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `registration_number` varchar(60) NOT NULL,
  `pan_number` varchar(30) NOT NULL,
  `contact_person` varchar(120) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `contact_email` varchar(190) NOT NULL,
  `province` varchar(60) NOT NULL,
  `district` varchar(60) NOT NULL,
  `city` varchar(80) NOT NULL,
  `address_line` varchar(190) NOT NULL,
  `description` text DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `bank_name` varchar(120) DEFAULT NULL,
  `bank_account_name` varchar(120) DEFAULT NULL,
  `bank_account_number` varchar(40) DEFAULT NULL,
  `bank_branch` varchar(120) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` varchar(255) DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_orders` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ;

--
-- Dumping data for table `sellers`
--

INSERT INTO `sellers` (`id`, `user_id`, `business_name`, `slug`, `registration_number`, `pan_number`, `contact_person`, `contact_phone`, `contact_email`, `province`, `district`, `city`, `address_line`, `description`, `logo_url`, `bank_name`, `bank_account_name`, `bank_account_number`, `bank_branch`, `commission_rate`, `approval_status`, `rejection_reason`, `approved_by`, `approved_at`, `rating`, `total_orders`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 3, 'Himalaya Hydro Supplies', 'himalaya-hydro-supplies', 'REG-118842', '301882445', 'Sagar Thapa', '+9779800000003', 'seller@example.com', 'Bagmati', 'Kathmandu', 'Kathmandu', 'Balaju Industrial Area', NULL, NULL, NULL, NULL, NULL, NULL, 10.00, 'APPROVED', NULL, 1, '2026-08-24 16:06:36', 0.00, 0, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(2, 21, 'parts and parts', 'parts-and-parts', '34986827346', '2387466', 'Anil Bhandari', '7347873422', 'iamavishah102@gmail.com', 'bagmati', 'kathmandu', 'kathmandu', 'kathmandu nepal', 'glsadkjf aoisdj ans faj', NULL, 'Laxmi bank', NULL, '324823232344411', NULL, NULL, 'PENDING', NULL, NULL, NULL, 0.00, 0, '2026-09-27 01:39:01', '2026-09-27 01:39:01', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `seller_documents`
--

CREATE TABLE `seller_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `seller_id` bigint(20) UNSIGNED NOT NULL,
  `document_type` enum('BUSINESS_REGISTRATION','PAN','VAT','IDENTITY','BANK_DOCUMENT','OTHER') NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `file_name` varchar(190) NOT NULL,
  `mime_type` varchar(80) NOT NULL,
  `file_size` int(10) UNSIGNED NOT NULL,
  `status` enum('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `review_note` varchar(255) DEFAULT NULL,
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `seller_listings`
--

CREATE TABLE `seller_listings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `seller_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `sku` varchar(80) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `mrp` decimal(12,2) DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'NPR',
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `min_order_qty` int(11) NOT NULL DEFAULT 1,
  `lead_time_days` int(11) NOT NULL DEFAULT 3,
  `warranty_months` int(11) NOT NULL DEFAULT 0,
  `condition_type` enum('NEW','REFURBISHED') NOT NULL DEFAULT 'NEW',
  `is_genuine` tinyint(1) NOT NULL DEFAULT 1,
  `approval_status` enum('PENDING_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  `rejection_reason` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ;

--
-- Dumping data for table `seller_listings`
--

INSERT INTO `seller_listings` (`id`, `seller_id`, `product_id`, `sku`, `price`, `mrp`, `currency`, `stock_quantity`, `min_order_qty`, `lead_time_days`, `warranty_months`, `condition_type`, `is_genuine`, `approval_status`, `rejection_reason`, `is_active`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 1, 'HHS-PLT-2001', 182500.00, 195000.00, 'NPR', 12, 1, 7, 12, 'NEW', 1, 'APPROVED', NULL, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(2, 1, 2, 'HHS-BFV-0600', 96500.00, 104000.00, 'NPR', 8, 1, 5, 18, 'NEW', 1, 'APPROVED', NULL, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(3, 1, 3, 'HHS-MSL-0120', 18750.00, 21000.00, 'NPR', 45, 1, 3, 6, 'NEW', 1, 'APPROVED', NULL, 1, '2026-08-24 16:06:36', '2026-08-24 16:06:36', NULL),
(4, 1, 6, NULL, 2345.00, NULL, 'NPR', 7, 1, 3, 0, 'NEW', 1, 'APPROVED', NULL, 1, '2026-09-11 16:59:13', '2026-09-11 16:59:13', NULL),
(5, 1, 7, NULL, 232.00, NULL, 'NPR', 33, 1, 3, 0, 'REFURBISHED', 1, 'REJECTED', 'not good', 0, '2026-09-11 17:10:38', '2026-09-11 17:11:51', NULL),
(6, 1, 8, NULL, 660.00, NULL, 'NPR', 500, 1, 3, 0, 'NEW', 1, 'APPROVED', NULL, 1, '2026-09-13 21:01:38', '2026-09-13 21:01:38', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `settlements`
--

CREATE TABLE `settlements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `seller_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `gross_amount` decimal(12,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` decimal(12,2) NOT NULL,
  `status` enum('PENDING','PROCESSING','PAID','ON_HOLD') NOT NULL DEFAULT 'PENDING',
  `payout_reference` varchar(120) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_number` varchar(30) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `role` enum('GUEST','BUYER','SELLER') NOT NULL DEFAULT 'GUEST',
  `name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'GENERAL',
  `subject` varchar(190) NOT NULL,
  `message` text NOT NULL,
  `order_number` varchar(40) DEFAULT NULL,
  `status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `admin_reply` text DEFAULT NULL,
  `replied_by` bigint(20) UNSIGNED DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `support_tickets`
--

INSERT INTO `support_tickets` (`id`, `ticket_number`, `user_id`, `role`, `name`, `email`, `phone`, `category`, `subject`, `message`, `order_number`, `status`, `admin_reply`, `replied_by`, `replied_at`, `created_at`, `updated_at`) VALUES
(1, 'HS-SUP-MTWXPJTW', NULL, 'GUEST', 'Abhishek Shah', 'iamavishah100@gmail.com', '', 'GENERAL', 'joojp', 'mhjfhgjb nljknhjn', '', 'OPEN', NULL, NULL, NULL, '2026-09-11 18:00:34', '2026-09-11 18:00:34'),
(2, 'HS-SUP-MTWXUA3S', NULL, 'GUEST', 'Abhishek Shah', 'iamavishah100@gmail.com', '', 'GENERAL', 'asdfwefa', 'a,msdfnkjewenfkn  adf', '', 'OPEN', NULL, NULL, NULL, '2026-09-11 18:04:15', '2026-09-11 18:04:15'),
(3, 'HS-SUP-MTWXUAXM', NULL, 'GUEST', 'Abhishek Shah', 'iamavishah100@gmail.com', '', 'GENERAL', 'asdfwefa', 'a,msdfnkjewenfkn  adf', '', 'OPEN', NULL, NULL, NULL, '2026-09-11 18:04:16', '2026-09-11 18:04:16'),
(4, 'HS-SUP-MTWXUXT3', NULL, 'GUEST', 'Abhishek Shah', 'iamavishah100@gmail.com', '', 'GENERAL', 'asdfwefa', 'a,msdfnkjewenfkn  adf', '', 'OPEN', NULL, NULL, NULL, '2026-09-11 18:04:46', '2026-09-11 18:04:46'),
(5, 'HS-SUP-MU3OTL1R', 3, 'SELLER', 'Sagar Thapa', 'seller@example.com', '', 'TECHNICAL', 'this is me', 'check it out', '', 'IN_PROGRESS', 'iwill solve', 1, '2026-09-16 11:48:35', '2026-09-16 11:26:09', '2026-09-16 11:48:35'),
(6, 'HS-SUP-MU9Z03E7', 3, 'SELLER', 'Sagar Thapa', 'seller@example.com', '2384798', 'PRODUCT', 'Incorrect billing after account cancellation request – Invoice #3131668 (February 2026)', '2i3u4yidjfshjknhoishfdbn', '9823749', 'IN_PROGRESS', 'we will see', 1, '2026-09-20 21:01:11', '2026-09-20 20:57:46', '2026-09-20 21:01:11');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('BUYER','SELLER','ADMIN') NOT NULL DEFAULT 'BUYER',
  `status` enum('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  `email_verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `role`, `status`, `email_verified_at`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Hydro Sathi Admin', 'admin@hydrosathi.com', '+9779800000001', '$2a$12$3rJrBbnVJOOSsJ73H/j0iOYrHd7z4nfyjpARsXIinWHnMkZAqA9aq', 'ADMIN', 'ACTIVE', '2026-09-07 03:01:59', '2026-09-27 01:46:17', '2026-08-24 16:06:34', '2026-09-27 01:46:17', NULL),
(2, 'Bishnu Adhikari', 'buyer@example.com', '+9779800000002', '$2y$12$REPLACE_WITH_REAL_HASH', 'BUYER', 'ACTIVE', '2026-08-24 16:06:34', NULL, '2026-08-24 16:06:34', '2026-08-24 16:06:34', NULL),
(3, 'Sagar Thapa', 'seller@example.com', '+9779800000003', '$2a$12$19/6JTgca8I.vKUYu7TiceJR2gb8L6NQiAY2OHF9A3MmJuarESkke', 'SELLER', 'ACTIVE', '2026-08-24 16:06:34', '2026-09-27 01:32:55', '2026-08-24 16:06:34', '2026-09-27 01:32:55', NULL),
(19, 'Abhishek Shah', 'iamavishah100@gmail.com', '7347873423', '$2a$12$RyzOuKcoagdP0l0LAaWkAebesTYtUq0rg0z6Gy.aJGUdcSpRmBqGa', 'BUYER', 'ACTIVE', '2026-09-20 20:54:01', NULL, '2026-09-20 20:53:08', '2026-09-20 20:54:01', NULL),
(21, 'Anil Bhandari', 'iamavishah102@gmail.com', '7347873422', '$2a$12$zctYjwuJAd0YawgR1DsjTOIbUMn2LAIIjQ8ITm88ed1UGr9eKRJq2', 'SELLER', 'ACTIVE', NULL, NULL, '2026-09-27 01:39:01', '2026-09-27 01:39:01', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_addresses`
--

CREATE TABLE `user_addresses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `label` varchar(60) NOT NULL DEFAULT 'Default',
  `contact_name` varchar(120) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `province` varchar(60) NOT NULL,
  `district` varchar(60) NOT NULL,
  `city` varchar(80) NOT NULL,
  `street` varchar(190) NOT NULL,
  `landmark` varchar(190) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_product_best_offer`
-- (See below for the actual view)
--
CREATE TABLE `v_product_best_offer` (
`product_id` bigint(20) unsigned
,`name` varchar(190)
,`part_number` varchar(80)
,`best_price` decimal(12,2)
,`seller_count` bigint(21)
,`total_stock` decimal(32,0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_seller_revenue`
-- (See below for the actual view)
--
CREATE TABLE `v_seller_revenue` (
`seller_id` bigint(20) unsigned
,`business_name` varchar(160)
,`orders_count` bigint(21)
,`gross_revenue` decimal(34,2)
,`commission_paid` decimal(34,2)
,`net_revenue` decimal(34,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `wishlist_items`
--

CREATE TABLE `wishlist_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure for view `v_product_best_offer`
--
DROP TABLE IF EXISTS `v_product_best_offer`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_product_best_offer`  AS SELECT `p`.`id` AS `product_id`, `p`.`name` AS `name`, `p`.`part_number` AS `part_number`, min(`sl`.`price`) AS `best_price`, count(`sl`.`id`) AS `seller_count`, sum(`sl`.`stock_quantity`) AS `total_stock` FROM (`products` `p` join `seller_listings` `sl` on(`sl`.`product_id` = `p`.`id` and `sl`.`is_active` = 1 and `sl`.`approval_status` = 'APPROVED')) WHERE `p`.`status` = 'ACTIVE' GROUP BY `p`.`id`, `p`.`name`, `p`.`part_number` ;

-- --------------------------------------------------------

--
-- Structure for view `v_seller_revenue`
--
DROP TABLE IF EXISTS `v_seller_revenue`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_seller_revenue`  AS SELECT `s`.`id` AS `seller_id`, `s`.`business_name` AS `business_name`, count(distinct `oi`.`order_id`) AS `orders_count`, coalesce(sum(`oi`.`subtotal`),0) AS `gross_revenue`, coalesce(sum(`oi`.`commission_amount`),0) AS `commission_paid`, coalesce(sum(`oi`.`seller_amount`),0) AS `net_revenue` FROM (`sellers` `s` left join `order_items` `oi` on(`oi`.`seller_id` = `s`.`id` and `oi`.`item_status` not in ('CANCELLED','REFUNDED'))) GROUP BY `s`.`id`, `s`.`business_name` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`,`created_at`),
  ADD KEY `idx_audit_actor` (`actor_id`,`created_at`);

--
-- Indexes for table `brands`
--
ALTER TABLE `brands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_brands_slug` (`slug`);

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cart_user_listing` (`user_id`,`listing_id`),
  ADD KEY `fk_cart_listing` (`listing_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_categories_slug` (`slug`),
  ADD KEY `idx_categories_parent` (`parent_id`,`is_active`);

--
-- Indexes for table `commission_records`
--
ALTER TABLE `commission_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_commission_item` (`order_item_id`),
  ADD KEY `idx_commission_seller` (`seller_id`,`status`),
  ADD KEY `fk_comm_order` (`order_id`);

--
-- Indexes for table `commission_settings`
--
ALTER TABLE `commission_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_commission_scope` (`scope_type`,`scope_id`,`effective_from`),
  ADD KEY `fk_commission_creator` (`created_by`);

--
-- Indexes for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_email_verify_token` (`token_hash`),
  ADD KEY `idx_email_verify_user` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user` (`user_id`,`is_read`,`created_at`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_orders_number` (`order_number`),
  ADD KEY `idx_orders_user` (`user_id`,`created_at`),
  ADD KEY `idx_orders_status` (`order_status`,`payment_status`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order` (`order_id`),
  ADD KEY `idx_order_items_seller` (`seller_id`,`item_status`),
  ADD KEY `fk_items_listing` (`listing_id`),
  ADD KEY `fk_items_product` (`product_id`);

--
-- Indexes for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_history_order` (`order_id`,`created_at`),
  ADD KEY `fk_history_user` (`changed_by`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reset_token` (`token_hash`),
  ADD KEY `idx_reset_user` (`user_id`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_provider_txn` (`provider`,`provider_txn_id`),
  ADD KEY `idx_payments_order` (`order_id`,`status`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_products_slug` (`slug`),
  ADD UNIQUE KEY `uq_products_part_number` (`part_number`),
  ADD KEY `idx_products_category` (`category_id`,`status`),
  ADD KEY `idx_products_brand` (`brand_id`),
  ADD KEY `idx_products_oem` (`oem_number`),
  ADD KEY `fk_products_creator` (`created_by`),
  ADD KEY `fk_products_approver` (`approved_by`),
  ADD KEY `idx_products_featured` (`is_featured`,`status`),
  ADD KEY `idx_products_new` (`is_new_arrival`,`status`);
ALTER TABLE `products` ADD FULLTEXT KEY `ft_products_search` (`name`,`part_number`,`oem_number`,`manufacturer`,`short_description`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_images` (`product_id`,`sort_order`);

--
-- Indexes for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_review_user_item` (`user_id`,`order_item_id`),
  ADD KEY `idx_reviews_product` (`product_id`,`status`),
  ADD KEY `fk_review_item` (`order_item_id`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_refresh_hash` (`token_hash`),
  ADD KEY `idx_refresh_user` (`user_id`,`revoked_at`),
  ADD KEY `idx_refresh_family` (`family_id`);

--
-- Indexes for table `refunds`
--
ALTER TABLE `refunds`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_refunds_order` (`order_id`,`status`),
  ADD KEY `fk_refunds_item` (`order_item_id`),
  ADD KEY `fk_refunds_req` (`requested_by`),
  ADD KEY `fk_refunds_proc` (`processed_by`);

--
-- Indexes for table `sellers`
--
ALTER TABLE `sellers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sellers_user` (`user_id`),
  ADD UNIQUE KEY `uq_sellers_slug` (`slug`),
  ADD UNIQUE KEY `uq_sellers_pan` (`pan_number`),
  ADD KEY `idx_sellers_status` (`approval_status`),
  ADD KEY `fk_sellers_approver` (`approved_by`);

--
-- Indexes for table `seller_documents`
--
ALTER TABLE `seller_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_seller_docs` (`seller_id`,`document_type`),
  ADD KEY `fk_docs_reviewer` (`reviewed_by`);

--
-- Indexes for table `seller_listings`
--
ALTER TABLE `seller_listings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_listing_seller_product` (`seller_id`,`product_id`),
  ADD KEY `idx_listing_product_price` (`product_id`,`price`),
  ADD KEY `idx_listing_active` (`is_active`,`approval_status`);

--
-- Indexes for table `settlements`
--
ALTER TABLE `settlements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_settlement_seller_order` (`seller_id`,`order_id`),
  ADD KEY `idx_settlement_status` (`status`,`created_at`),
  ADD KEY `fk_settle_order` (`order_id`);

--
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_support_ticket_number` (`ticket_number`),
  ADD KEY `idx_support_status` (`status`,`created_at`),
  ADD KEY `idx_support_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD UNIQUE KEY `uq_users_phone` (`phone`),
  ADD KEY `idx_users_role_status` (`role`,`status`);

--
-- Indexes for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_addresses_user` (`user_id`,`is_default`);

--
-- Indexes for table `wishlist_items`
--
ALTER TABLE `wishlist_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_wishlist` (`user_id`,`product_id`),
  ADD KEY `fk_wishlist_product` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `commission_records`
--
ALTER TABLE `commission_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commission_settings`
--
ALTER TABLE `commission_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_verifications`
--
ALTER TABLE `email_verifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_status_history`
--
ALTER TABLE `order_status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `product_reviews`
--
ALTER TABLE `product_reviews`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `refunds`
--
ALTER TABLE `refunds`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sellers`
--
ALTER TABLE `sellers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_documents`
--
ALTER TABLE `seller_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seller_listings`
--
ALTER TABLE `seller_listings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settlements`
--
ALTER TABLE `settlements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `user_addresses`
--
ALTER TABLE `user_addresses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `wishlist_items`
--
ALTER TABLE `wishlist_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `fk_cart_listing` FOREIGN KEY (`listing_id`) REFERENCES `seller_listings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `commission_records`
--
ALTER TABLE `commission_records`
  ADD CONSTRAINT `fk_comm_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_comm_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_comm_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `commission_settings`
--
ALTER TABLE `commission_settings`
  ADD CONSTRAINT `fk_commission_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD CONSTRAINT `fk_email_verify_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_items_listing` FOREIGN KEY (`listing_id`) REFERENCES `seller_listings` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_items_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD CONSTRAINT `fk_history_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_products_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_images` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD CONSTRAINT `fk_review_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_review_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `refunds`
--
ALTER TABLE `refunds`
  ADD CONSTRAINT `fk_refunds_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_refunds_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_refunds_proc` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_refunds_req` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sellers`
--
ALTER TABLE `sellers`
  ADD CONSTRAINT `fk_sellers_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sellers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `seller_documents`
--
ALTER TABLE `seller_documents`
  ADD CONSTRAINT `fk_docs_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_docs_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `seller_listings`
--
ALTER TABLE `seller_listings`
  ADD CONSTRAINT `fk_listing_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_listing_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `settlements`
--
ALTER TABLE `settlements`
  ADD CONSTRAINT `fk_settle_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_settle_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_addresses`
--
ALTER TABLE `user_addresses`
  ADD CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `wishlist_items`
--
ALTER TABLE `wishlist_items`
  ADD CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
