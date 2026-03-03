<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('scan_events', 'created_at') && ! Schema::hasColumn('scan_events', 'updated_at')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->timestamps();
            });

            return;
        }

        if (! Schema::hasColumn('scan_events', 'created_at')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! Schema::hasColumn('scan_events', 'updated_at')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->timestamp('updated_at')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('scan_events', 'updated_at')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->dropColumn('updated_at');
            });
        }

        if (Schema::hasColumn('scan_events', 'created_at')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->dropColumn('created_at');
            });
        }
    }
};
