<?php
declare(strict_types=1);

final class Course
{
    public function __construct(public readonly int $id, public readonly string $code, public readonly string $name, public readonly string $term, public readonly bool $isActive) {}

    public function toArray(): array
    {
        return ['id' => $this->id, 'code' => $this->code, 'name' => $this->name, 'term' => $this->term, 'is_active' => $this->isActive];
    }
}
