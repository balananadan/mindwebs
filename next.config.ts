import type { NextConfig } from "next";



/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/mindwebs-dashboard", // <- This is the key part
  reactStrictMode: true,
};

module.exports = nextConfig;

export default nextConfig;
