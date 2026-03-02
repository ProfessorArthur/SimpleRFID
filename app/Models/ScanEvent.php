<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScanEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'card_id',
        'scanned_at',
        'source',
        'target_field',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(RfidCard::class, 'card_id');
    }
}
