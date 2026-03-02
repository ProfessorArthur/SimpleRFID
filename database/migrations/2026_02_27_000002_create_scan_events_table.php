<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scan_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('rfid_cards')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamp('scanned_at');
            $table->string('source')->default('web-serial');
            $table->string('target_field')->nullable();
            $table->timestamps();

            $table->index('scanned_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scan_events');
    }
};
