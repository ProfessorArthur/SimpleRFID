<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RfidCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'uid',
        'first_seen_at',
        'last_seen_at',
        'total_scans',
    ];

    protected $casts = [
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function scanEvents(): HasMany
    {
        return $this->hasMany(ScanEvent::class, 'card_id');
    }
}
