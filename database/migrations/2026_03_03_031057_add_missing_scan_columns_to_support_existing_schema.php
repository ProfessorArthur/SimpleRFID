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
        if (! Schema::hasColumn('rfid_cards', 'first_seen_at')) {
            Schema::table('rfid_cards', function (Blueprint $table) {
                $table->timestamp('first_seen_at')->nullable()->after('uid');
            });
        }

        if (! Schema::hasColumn('scan_events', 'source')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->string('source')->default('web-serial')->after('scanned_at');
            });
        }

        if (! Schema::hasColumn('scan_events', 'target_field')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->string('target_field')->nullable()->after('source');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('scan_events', 'target_field')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->dropColumn('target_field');
            });
        }

        if (Schema::hasColumn('scan_events', 'source')) {
            Schema::table('scan_events', function (Blueprint $table) {
                $table->dropColumn('source');
            });
        }

        if (Schema::hasColumn('rfid_cards', 'first_seen_at')) {
            Schema::table('rfid_cards', function (Blueprint $table) {
                $table->dropColumn('first_seen_at');
            });
        }
    }
};
