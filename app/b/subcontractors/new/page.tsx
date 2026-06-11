'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Project = { id: string; name: string; address?: string | null; city?: string | null; stage?: string | null };

const fields = ['Plumbing company', 'Electrical contractor', 'Steel fixing