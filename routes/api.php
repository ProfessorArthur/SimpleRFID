<?php

use App\Http\Controllers\Api\ScanController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [ScanController::class, 'health']);
Route::post('/scans', [ScanController::class, 'store']);
Route::get('/scans', [ScanController::class, 'scans']);
Route::get('/cards', [ScanController::class, 'cards']);
Route::get('/safety/db', [ScanController::class, 'safetyDb']);
