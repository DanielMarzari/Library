"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Book } from "@/types/book";
import Link from "next/link";

interface ReadingUpdate {
  id: string;
  book_id: string;
  pages_read: number;
  created_at: string;
}

// Colors for each year in the cumulative chart
const YEAR_COLORS: Record<number, string> = {
  2016: "#9ca3af",
  2017: "#a78bfa",
  2018: "#f472b6",
  2019: "#60a5fa",
  2020: "#ef4444",
  2021: "#eab308",
  2022: "#22c55e",
  2023: "#f97316",
  2024: "#06b6d4",
  2025: "#3b82f6",
  2026: "#ef4444",
};

const LENGTH_BUCKETS = [
  { label: "0-50", min: 0, max: 50 },
  { label: "51-100", min: 51, max: 100 },
  { label: "101-150", min: 101, max: 150 },
  { label: "151-200", min: 151, max: 200 },
  { label: "201-250", min: 201, max: 250 },
  { label: "251-300", min: 251, max: 300 },
  { label: "301-500", min: 301, max: 500 },
  { label: "501+", min: 501, max: 99999 },
];

interface AuthorMeta {
  name: string;
  gender: string | null;
  ethnicity: string | null;
  nationality: string | null;
  country: string | null;
  birth_year: number | null;
  death_year: number | null;
  discipline: string | null;
  era: string | null;
  denomination: string | null;
  school: string | null;
}

// Country centroids for the world map — lat/lon of each country's rough center.
// Used to plot dots on an equirectangular projection (viewBox 0 0 720 360).
// Add rows here as new countries appear in your data.
const COUNTRY_LATLON: Record<string, [number, number]> = {
  "United States": [39.8, -98.6], "United States of America": [39.8, -98.6],
  "Canada": [56.1, -106.3], "Mexico": [23.6, -102.6],
  "United Kingdom": [54.0, -2.5], "England": [52.5, -1.5], "Scotland": [56.5, -4.0],
  "Ireland": [53.1, -7.7], "France": [46.2, 2.2], "Germany": [51.2, 10.5],
  "Italy": [41.9, 12.6], "Spain": [40.5, -3.7], "Portugal": [39.4, -8.2],
  "Netherlands": [52.1, 5.3], "Kingdom of the Netherlands": [52.1, 5.3],
  "Belgium": [50.5, 4.5], "Switzerland": [46.8, 8.2], "Austria": [47.5, 14.6],
  "Denmark": [56.3, 9.5], "Sweden": [60.1, 18.6], "Norway": [60.5, 8.5],
  "Finland": [61.9, 25.7], "Iceland": [64.9, -19.0], "Poland": [51.9, 19.1],
  "Czech Republic": [49.8, 15.5], "Hungary": [47.2, 19.5], "Romania": [45.9, 24.9],
  "Greece": [39.1, 21.8], "Bulgaria": [42.7, 25.5], "Ukraine": [48.4, 31.2],
  "Russia": [61.5, 105.3], "Turkey": [38.9, 35.2], "Israel": [31.0, 34.9],
  "Lebanon": [33.9, 35.9], "Syria": [34.8, 38.9], "Egypt": [26.8, 30.8],
  "Ethiopia": [9.1, 40.5], "Kenya": [-0.0, 37.9], "Nigeria": [9.1, 8.7],
  "South Africa": [-30.6, 22.9], "Ghana": [7.9, -1.0], "Uganda": [1.4, 32.3],
  "China": [35.9, 104.2], "Japan": [36.2, 138.3], "South Korea": [35.9, 127.8],
  "North Korea": [40.3, 127.5], "India": [20.6, 78.9], "Pakistan": [30.4, 69.3],
  "Bangladesh": [23.7, 90.4], "Sri Lanka": [7.9, 80.8], "Vietnam": [14.1, 108.3],
  "Thailand": [15.9, 100.9], "Indonesia": [-0.8, 113.9], "Philippines": [12.9, 121.8],
  "Malaysia": [4.2, 101.9], "Singapore": [1.3, 103.8], "Australia": [-25.3, 133.8],
  "New Zealand": [-40.9, 174.9], "Brazil": [-14.2, -51.9], "Argentina": [-38.4, -63.6],
  "Chile": [-35.7, -71.5], "Colombia": [4.6, -74.3], "Peru": [-9.2, -75.0],
  "Venezuela": [6.4, -66.6], "Cuba": [21.5, -77.8], "Jamaica": [18.1, -77.3],
  "Iran": [32.4, 53.7], "Iraq": [33.2, 43.7], "Saudi Arabia": [23.9, 45.1],
  "Afghanistan": [33.9, 67.7], "Kingdom of England": [52.5, -1.5],
};

// Simplified world land-mass outline for the map background. Points are the
// convex hulls of each continent in equirectangular space (viewBox 720×360 =
// [-180…180, -90…90] with y flipped). Approximation only — the goal is a
// legible shape behind the country dots, not cartographic accuracy.
const WORLD_LAND_PATHS = [
  // North America
  "M 60 60 L 130 45 L 175 55 L 220 90 L 240 130 L 210 170 L 170 175 L 145 155 L 120 120 L 90 100 L 60 90 Z",
  // South America
  "M 200 195 L 240 195 L 260 240 L 250 290 L 230 315 L 200 305 L 190 260 L 195 220 Z",
  // Europe
  "M 335 65 L 400 55 L 430 70 L 445 100 L 430 125 L 400 130 L 370 120 L 340 105 Z",
  // Africa
  "M 355 145 L 420 140 L 445 170 L 460 230 L 435 280 L 400 285 L 375 250 L 360 200 Z",
  // Asia
  "M 445 55 L 560 45 L 640 70 L 670 110 L 665 155 L 610 170 L 555 165 L 500 145 L 465 120 L 445 90 Z",
  // Indian subcontinent nub
  "M 515 155 L 550 155 L 555 200 L 535 210 L 520 190 Z",
  // Southeast Asia
  "M 600 175 L 655 175 L 660 210 L 630 215 L 605 200 Z",
  // Australia
  "M 605 250 L 665 245 L 685 275 L 665 295 L 620 290 L 605 275 Z",
];

export default function StatsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [readingUpdates, setReadingUpdates] = useState<ReadingUpdate[]>([]);
  const [authorMeta, setAuthorMeta] = useState<AuthorMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const data = await api.books.list();
        if (!ignore) {
          setBooks(data || []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading books:", error);
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const data = await api.readingUpdates.list();
        if (!ignore) {
          setReadingUpdates(data || []);
        }
      } catch (error) {
        console.error("Error loading reading updates:", error);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const data = await api.authors.list();
        if (!ignore) {
          setAuthorMeta(data as AuthorMeta[]);
        }
      } catch (error) {
        console.error("Error loading authors:", error);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  const stats = useMemo(() => {
    const total = books.length;
    const read = books.filter((b) => b.status === "read");
    const reading = books.filter((b) => b.status === "reading");
    const notRead = books.filter((b) => b.status === "not_read");

    const totalPages = books.reduce((s, b) => s + (b.reading_pages || b.pages || 0), 0);
    const readPages = read.reduce((s, b) => s + (b.reading_pages || b.pages || 0), 0);
    const readingPages = reading.reduce((s, b) => s + (b.current_page || 0), 0);
    const pctBooksRead = total > 0 ? ((read.length / total) * 100).toFixed(1) : "0";
    const pctPagesRead = totalPages > 0 ? (((readPages + readingPages) / totalPages) * 100).toFixed(1) : "0";

    // --- Year-over-year cumulative chart (books completed per week) ---
    const yearData: Record<number, number[]> = {};
    read.forEach((b) => {
      if (!b.complete_date) return;
      const d = new Date(b.complete_date);
      const year = d.getFullYear();
      const dayOfYear = Math.floor(
        (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000
      );
      const week = Math.floor(dayOfYear / 7);
      if (!yearData[year]) yearData[year] = [];
      yearData[year].push(week);
    });

    // Build cumulative per year (53 weeks)
    const yearCumulative: Record<number, number[]> = {};
    Object.entries(yearData).forEach(([yr, weeks]) => {
      const y = parseInt(yr);
      const counts = new Array(53).fill(0);
      weeks.forEach((w) => {
        if (w < 53) counts[w]++;
      });
      // Cumulate
      const cum = new Array(53).fill(0);
      cum[0] = counts[0];
      for (let i = 1; i < 53; i++) {
        cum[i] = cum[i - 1] + counts[i];
      }
      yearCumulative[y] = cum;
    });

    const years = Object.keys(yearCumulative)
      .map(Number)
      .sort();
    const maxCumulative = Math.max(
      ...Object.values(yearCumulative).map((c) => Math.max(...c)),
      1
    );

    // --- Read/Unread/Reading by book length ---
    const lengthData = LENGTH_BUCKETS.map((bucket) => {
      const inBucket = books.filter((b) => {
        const p = b.reading_pages || b.pages || 0;
        return p >= bucket.min && p <= bucket.max;
      });
      const r = inBucket.filter((b) => b.status === "read").length;
      const rding = inBucket.filter((b) => b.status === "reading").length;
      const nr = inBucket.filter((b) => b.status === "not_read").length;
      const t = inBucket.length;
      return {
        label: bucket.label,
        read: r,
        reading: rding,
        notRead: nr,
        total: t,
        readPct: t > 0 ? (r / t) * 100 : 0,
        readingPct: t > 0 ? (rding / t) * 100 : 0,
        notReadPct: t > 0 ? (nr / t) * 100 : 0,
      };
    });

    // --- Reading rate from Jan 1 last year to present ---
    const jan1LastYear = new Date(new Date().getFullYear() - 1, 0, 1);
    const now = new Date();
    const recentBooks = read.filter(
      (b) => b.complete_date && new Date(b.complete_date) >= jan1LastYear
    );
    const daysSinceJan1 = Math.max(
      1,
      Math.ceil((now.getTime() - jan1LastYear.getTime()) / 86400000)
    );
    const booksPerMonth = recentBooks.length / (daysSinceJan1 / 30.44);
    const booksPerWeek = recentBooks.length / (daysSinceJan1 / 7);

    // Pages per day — from April 1 of current year, only counting days with activity
    const apr1 = new Date(now.getFullYear(), 3, 1); // month is 0-indexed, so 3 = April
    const apr1Key = apr1.toISOString().split('T')[0];
    // We'll compute this after pagesPerDay is built (see below); placeholder here
    let avgPagesPerDay = 0;

    // Avg days per book
    const booksWithDates = read.filter((b) => b.start_date && b.complete_date);
    let avgDaysPerBook = 0;
    if (booksWithDates.length > 0) {
      const totalDays = booksWithDates.reduce((sum, b) => {
        const s = new Date(b.start_date!);
        const e = new Date(b.complete_date!);
        return sum + Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
      }, 0);
      avgDaysPerBook = Math.round(totalDays / booksWithDates.length);
    }

    // --- Top user topics ---
    const topicCounts: Record<string, number> = {};
    books.forEach((b) => {
      b.topics?.forEach((t) => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });
    const topUserTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // --- Top auto topics ---
    const autoTopicCounts: Record<string, number> = {};
    books.forEach((b) => {
      b.auto_topics?.forEach((t) => {
        autoTopicCounts[t] = (autoTopicCounts[t] || 0) + 1;
      });
    });
    const topAutoTopics = Object.entries(autoTopicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // --- 1000 book life goal ---
    const LIFE_GOAL = 1000;
    const goalPct = ((read.length / LIFE_GOAL) * 100).toFixed(1);
    const goalRemaining = LIFE_GOAL - read.length;
    // Projected completion: use recent rate (booksPerMonth)
    let goalProjectedDate: string | null = null;
    const monthlyRate = recentBooks.length / (daysSinceJan1 / 30.44);
    if (monthlyRate > 0 && goalRemaining > 0) {
      const monthsLeft = goalRemaining / monthlyRate;
      const projected = new Date();
      projected.setMonth(projected.getMonth() + Math.ceil(monthsLeft));
      goalProjectedDate = projected.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    // --- Scatter plot: duration vs book length, sized by rating ---
    const scatterData: Array<{ title: string; days: number; pages: number; rating: number }> = [];
    read.forEach((b) => {
      if (!b.start_date || !b.complete_date) return;
      const pages = b.reading_pages || b.pages || 0;
      if (pages === 0) return;
      const startDate = new Date(b.start_date);
      const endDate = new Date(b.complete_date);
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
      scatterData.push({
        title: b.title || "Unknown",
        days: Math.min(days, 365),
        pages: Math.min(pages, 1000),
        rating: b.rating || 0,
      });
    });
    const maxScatterDays = Math.max(...scatterData.map((d) => d.days), 30);
    const maxScatterPages = Math.max(...scatterData.map((d) => d.pages), 100);

    // --- Projected books this year ---
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const booksThisYear = read.filter(
      (b) => b.complete_date && new Date(b.complete_date) >= thisYearStart
    ).length;
    const daysSoFarThisYear = Math.max(1, Math.ceil((now.getTime() - thisYearStart.getTime()) / 86400000));
    const projectedBooksThisYear = Math.round((booksThisYear / daysSoFarThisYear) * 365);

    // --- Reading heatmap (last 12 months) ---
    const heatmapStartDate = new Date(now);
    heatmapStartDate.setFullYear(heatmapStartDate.getFullYear() - 1);

    // Normalize dates to start of day for comparison
    const pagesPerDay: Record<string, number> = {};
    const daysWithActivity = new Set<string>();

    // Add pages from reading_updates
    readingUpdates.forEach((update) => {
      const date = new Date(update.created_at);
      if (date >= heatmapStartDate && date <= now) {
        const dateKey = date.toISOString().split('T')[0];
        pagesPerDay[dateKey] = (pagesPerDay[dateKey] || 0) + update.pages_read;
        daysWithActivity.add(dateKey);
      }
    });

    // Add completion dates (if no reading_updates that day)
    read.forEach((b) => {
      if (b.complete_date) {
        const date = new Date(b.complete_date);
        if (date >= heatmapStartDate && date <= now) {
          const dateKey = date.toISOString().split('T')[0];
          if (!pagesPerDay[dateKey]) {
            pagesPerDay[dateKey] = b.reading_pages || b.pages || 0;
          }
          daysWithActivity.add(dateKey);
        }
      }
    });

    const totalHeatmapPages = Object.values(pagesPerDay).reduce((a, b) => a + b, 0);
    const maxPagesInDay = Math.max(...Object.values(pagesPerDay), 1);

    // Compute avgPagesPerDay: April 1 to present, only days with activity
    const activeDaysSinceApr1 = Object.entries(pagesPerDay).filter(
      ([dateKey, pages]) => dateKey >= apr1Key && pages > 0
    );
    if (activeDaysSinceApr1.length > 0) {
      const totalPagesApr1 = activeDaysSinceApr1.reduce((s, [, p]) => s + p, 0);
      avgPagesPerDay = Math.round(totalPagesApr1 / activeDaysSinceApr1.length);
    }

    // --- Author stats ---
    const authorCounts: Record<string, { books: number; read: number }> = {};
    books.forEach((b) => {
      if (!b.author) return;
      b.author.split(",").map((a) => a.trim()).filter(Boolean).forEach((name) => {
        if (!authorCounts[name]) authorCounts[name] = { books: 0, read: 0 };
        authorCounts[name].books++;
        if (b.status === "read") authorCounts[name].read++;
      });
    });
    const uniqueAuthors = Object.keys(authorCounts).length;
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1].books - a[1].books)
      .slice(0, 8);

    // --- Skill/topic stats ---
    const allTopicCounts: Record<string, { total: number; read: number }> = {};
    books.forEach((b) => {
      const allT = new Set<string>();
      b.topics?.forEach((t) => allT.add(t));
      b.auto_topics?.forEach((t) => allT.add(t));
      allT.forEach((t) => {
        if (!allTopicCounts[t]) allTopicCounts[t] = { total: 0, read: 0 };
        allTopicCounts[t].total++;
        if (b.status === "read") allTopicCounts[t].read++;
      });
    });
    const expertSkills = Object.values(allTopicCounts).filter((t) => t.read >= 20).length;
    const masterSkills = Object.values(allTopicCounts).filter((t) => t.read >= 50).length;

    // --- Top sources ---
    const sourceCounts: Record<string, number> = {};
    books.forEach((b) => {
      if (b.source) sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1;
    });
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // --- Author diversity ---
    const metaByName: Record<string, AuthorMeta> = {};
    authorMeta.forEach((a) => { metaByName[a.name] = a; });

    // Gender counts weighted by number of books
    const genderBookCounts: Record<string, number> = { Male: 0, Female: 0, Unknown: 0 };
    const genderAuthorCounts: Record<string, number> = { Male: 0, Female: 0, Unknown: 0 };
    const ethnicityBookCounts: Record<string, number> = {};
    const ethnicityAuthorCounts: Record<string, number> = {};
    const countryBookCounts: Record<string, number> = {};
    const countryAuthorCounts: Record<string, number> = {};
    const disciplineBookCounts: Record<string, number> = {};
    const eraBookCounts: Record<string, number> = {};
    const denominationBookCounts: Record<string, number> = {};
    const schoolBookCounts: Record<string, number> = {};
    // Country → also count of dead vs living for the map opacity treatment
    const currentYear = new Date().getFullYear();
    // Decade of birth histogram
    const decadeCounts: Record<number, number> = {};

    Object.entries(authorCounts).forEach(([name, counts]) => {
      const meta = metaByName[name];
      const gender = meta?.gender || "Unknown";
      const genderKey = gender.charAt(0).toUpperCase() === "M" ? "Male" : gender.charAt(0).toUpperCase() === "F" ? "Female" : "Unknown";
      genderBookCounts[genderKey] = (genderBookCounts[genderKey] || 0) + counts.books;
      genderAuthorCounts[genderKey] = (genderAuthorCounts[genderKey] || 0) + 1;

      if (meta?.ethnicity) {
        ethnicityBookCounts[meta.ethnicity] = (ethnicityBookCounts[meta.ethnicity] || 0) + counts.books;
        ethnicityAuthorCounts[meta.ethnicity] = (ethnicityAuthorCounts[meta.ethnicity] || 0) + 1;
      }
      if (meta?.country) {
        countryBookCounts[meta.country] = (countryBookCounts[meta.country] || 0) + counts.books;
        countryAuthorCounts[meta.country] = (countryAuthorCounts[meta.country] || 0) + 1;
      }
      if (meta?.discipline) {
        disciplineBookCounts[meta.discipline] = (disciplineBookCounts[meta.discipline] || 0) + counts.books;
      }
      if (meta?.era) {
        eraBookCounts[meta.era] = (eraBookCounts[meta.era] || 0) + counts.books;
      }
      if (meta?.denomination) {
        denominationBookCounts[meta.denomination] = (denominationBookCounts[meta.denomination] || 0) + counts.books;
      }
      if (meta?.school) {
        schoolBookCounts[meta.school] = (schoolBookCounts[meta.school] || 0) + counts.books;
      }
      if (meta?.birth_year) {
        const decade = Math.floor(meta.birth_year / 10) * 10;
        decadeCounts[decade] = (decadeCounts[decade] || 0) + counts.books;
      }
    });

    const totalGenderBooks = genderBookCounts.Male + genderBookCounts.Female + genderBookCounts.Unknown;
    const topEthnicities = Object.entries(ethnicityBookCounts).sort((a, b) => b[1] - a[1]);
    const topCountries = Object.entries(countryBookCounts).sort((a, b) => b[1] - a[1]);
    const topDisciplines = Object.entries(disciplineBookCounts).sort((a, b) => b[1] - a[1]);
    const topDenominations = Object.entries(denominationBookCounts).sort((a, b) => b[1] - a[1]);
    const topSchools = Object.entries(schoolBookCounts).sort((a, b) => b[1] - a[1]);

    // Era in canonical order (not by count)
    const ERA_ORDER = ["Ancient (pre-500)", "Medieval (500–1500)", "Reformation (1500–1700)", "Enlightenment (1700–1800)", "Modern (1800–1945)", "Contemporary (1945+)"];
    const eraSeries = ERA_ORDER.map(e => [e, eraBookCounts[e] || 0] as [string, number]);

    // Decade series in chronological order
    const decadeSeries = Object.entries(decadeCounts)
      .map(([d, n]) => [parseInt(d), n] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    // World map: countries with book counts + coordinates
    const countryMapPoints = topCountries
      .map(([country, books]) => {
        const latlon = COUNTRY_LATLON[country];
        if (!latlon) return null;
        const [lat, lon] = latlon;
        const x = (lon + 180) * 2; // 0–720
        const y = (90 - lat) * 2;  // 0–360
        return { country, books, authors: countryAuthorCounts[country] || 0, x, y };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
    const unmappedCountries = topCountries.filter(([c]) => !COUNTRY_LATLON[c]);

    return {
      total,
      readCount: read.length,
      readingCount: reading.length,
      notReadCount: notRead.length,
      totalPages,
      readPages,
      readingPages,
      pctBooksRead,
      pctPagesRead,
      yearCumulative,
      years,
      maxCumulative,
      lengthData,
      recentBooksCount: recentBooks.length,
      booksPerMonth: booksPerMonth.toFixed(1),
      booksPerWeek: booksPerWeek.toFixed(1),
      avgPagesPerDay,
      pagesPerDay,
      avgDaysPerBook,
      topUserTopics,
      topAutoTopics,
      scatterData,
      maxScatterDays,
      maxScatterPages,
      projectedBooksThisYear,
      booksThisYear,
      uniqueAuthors,
      topAuthors,
      expertSkills,
      masterSkills,
      topSources,
      goalPct,
      goalRemaining,
      goalProjectedDate,
      lifeGoal: LIFE_GOAL,
      heatmapStartDate,
      totalHeatmapPages,
      maxPagesInDay,
      daysWithActivity,
      genderBookCounts,
      genderAuthorCounts,
      totalGenderBooks,
      topEthnicities,
      ethnicityAuthorCounts,
      topCountries,
      topDisciplines,
      topDenominations,
      topSchools,
      eraSeries,
      decadeSeries,
      countryMapPoints,
      unmappedCountries,
    };
  }, [books, readingUpdates, authorMeta]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Reading Stats</h1>
          <Link
            href="/"
            className="text-muted hover:text-foreground text-sm font-medium transition-colors"
          >
            Back to Library
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 space-y-8">
        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Books" value={stats.total} />
          <StatCard label="Read" value={stats.readCount} color="emerald" />
          <StatCard label="Reading" value={stats.readingCount} color="blue" />
          <StatCard label="Not Read" value={stats.notReadCount} />
        </div>

        {/* Percentages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            <p className="text-xs text-muted mb-2">Books Read</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-400">{stats.pctBooksRead}%</span>
              <span className="text-xs text-muted-2 mb-1">{stats.readCount} / {stats.total}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 mt-3">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${stats.pctBooksRead}%` }} />
            </div>
          </div>
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            <p className="text-xs text-muted mb-2">Pages Read</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-400">{stats.pctPagesRead}%</span>
              <span className="text-xs text-muted-2 mb-1">{(stats.readPages + stats.readingPages).toLocaleString()} / {stats.totalPages.toLocaleString()}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 mt-3">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${stats.pctPagesRead}%` }} />
            </div>
          </div>
        </div>

        {/* 1000 Book Life Goal */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Life Goal: {stats.lifeGoal.toLocaleString()} Books</h2>
          <div className="bg-surface border border-border-custom rounded-xl p-5">
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-amber-400">{stats.goalPct}%</span>
              <span className="text-sm text-muted mb-1">{stats.readCount} / {stats.lifeGoal.toLocaleString()}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-3 mb-3">
              <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(stats.goalPct), 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{stats.goalRemaining} books to go</span>
              {stats.goalProjectedDate && (
                <span className="text-muted">On track for <span className="text-amber-400 font-medium">{stats.goalProjectedDate}</span></span>
              )}
            </div>
          </div>
        </section>

        {/* Reading rate */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Reading Rate <span className="text-sm text-muted font-normal">(Jan {new Date().getFullYear() - 1} - Present)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Books Completed" value={stats.recentBooksCount} color="emerald" />
            <StatCard label="Books / Month" value={stats.booksPerMonth} />
            <StatCard label="Books / Week" value={stats.booksPerWeek} />
            <StatCard label="Pages / Day" value={stats.avgPagesPerDay} />
            <StatCard label={`Projected ${new Date().getFullYear()}`} value={stats.projectedBooksThisYear} color="blue" />
          </div>
          {stats.avgDaysPerBook > 0 && (
            <p className="text-sm text-muted mt-3">
              Average time to finish a book: <span className="text-foreground font-medium">{stats.avgDaysPerBook} days</span>
            </p>
          )}
        </section>

        {/* Reading Activity Heatmap */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Reading Activity Heatmap</h2>
          <div className="bg-surface border border-border-custom rounded-xl p-6">
            <ContributionHeatmap
              startDate={stats.heatmapStartDate}
              pagesPerDay={stats.pagesPerDay}
              maxPagesInDay={stats.maxPagesInDay}
            />
            <p className="text-sm text-muted mt-4">
              {stats.totalHeatmapPages.toLocaleString()} pages across {stats.daysWithActivity.size} days in the last year
            </p>
          </div>
        </section>

        {/* Year-over-year cumulative chart */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Books Completed by Year
          </h2>
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {stats.years.map((yr) => (
                <div key={yr} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-1.5 rounded-full"
                    style={{
                      backgroundColor: YEAR_COLORS[yr] || "#6b7280",
                      ...(yr === new Date().getFullYear()
                        ? { borderStyle: "dashed", borderWidth: 1, borderColor: YEAR_COLORS[yr] || "#6b7280", backgroundColor: "transparent" }
                        : {}),
                    }}
                  />
                  <span className="text-[10px] text-muted font-medium">{yr}</span>
                </div>
              ))}
            </div>

            {/* SVG Chart */}
            <div className="relative" style={{ height: 200 }}>
              <svg viewBox="0 0 530 200" className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                  <line
                    key={pct}
                    x1="0"
                    y1={200 - pct * 200}
                    x2="530"
                    y2={200 - pct * 200}
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                ))}

                {/* Lines per year */}
                {stats.years.map((yr) => {
                  const cum = stats.yearCumulative[yr];
                  const points = cum
                    .map((v, i) => `${i * 10},${200 - (v / stats.maxCumulative) * 190}`)
                    .join(" ");

                  const isCurrentYear = yr === new Date().getFullYear();
                  return (
                    <polyline
                      key={yr}
                      points={points}
                      fill="none"
                      stroke={YEAR_COLORS[yr] || "#6b7280"}
                      strokeWidth={isCurrentYear ? 2.5 : 1.5}
                      strokeDasharray={isCurrentYear ? "6 3" : undefined}
                      opacity={isCurrentYear ? 1 : 0.8}
                    />
                  );
                })}
              </svg>

              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
                <span className="text-[9px] text-muted-2">{stats.maxCumulative}</span>
                <span className="text-[9px] text-muted-2">{Math.round(stats.maxCumulative / 2)}</span>
                <span className="text-[9px] text-muted-2">0</span>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between mt-1">
                {[0, 10, 20, 30, 40, 52].map((w) => (
                  <span key={w} className="text-[9px] text-muted-2">
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-2 text-center mt-1">Week of Year</p>
          </div>
        </section>

        {/* Ratio by book length */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Read / Unread Ratio by Book Length
          </h2>
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-muted">Read</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-muted">Reading</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-400/60" />
                <span className="text-muted">Unread</span>
              </div>
            </div>

            <div className="flex items-end gap-2 h-48">
              {stats.lengthData.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center h-full justify-end">
                  {d.total > 0 ? (
                    <div className="w-full flex flex-col rounded overflow-hidden" style={{ height: "100%" }}>
                      <div className="bg-rose-400/60 transition-all" style={{ flex: d.notReadPct }}>
                        {d.notReadPct > 15 && <span className="text-[8px] text-white/70 flex items-center justify-center h-full">{d.notRead}</span>}
                      </div>
                      <div className="bg-blue-500 transition-all" style={{ flex: d.readingPct }}>
                        {d.readingPct > 15 && <span className="text-[8px] text-white/70 flex items-center justify-center h-full">{d.reading}</span>}
                      </div>
                      <div className="bg-emerald-500 transition-all" style={{ flex: d.readPct }}>
                        {d.readPct > 15 && <span className="text-[8px] text-white/70 flex items-center justify-center h-full">{d.read}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-surface-2 h-2 rounded" />
                  )}
                  <span className="text-[9px] text-muted mt-2 whitespace-nowrap">{d.label}</span>
                  <span className="text-[8px] text-muted-2">{d.total}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-2 text-center mt-1">Book Length (pages)</p>
          </div>
        </section>

        {/* Duration vs Book Length scatter plot */}
        {stats.scatterData.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-1">Reading Duration vs Book Length</h2>
            <p className="text-sm text-muted mb-3">How long do different sized books take? Dot size = rating.</p>
            <div className="bg-surface border border-border-custom rounded-xl p-4">
              <div className="relative" style={{ height: 320 }}>
                <svg viewBox="0 0 520 310" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <g key={`grid-${pct}`}>
                      <line x1={60 + pct * 420} y1="20" x2={60 + pct * 420} y2="270" stroke="#27272a" strokeWidth="1" />
                      <line x1="60" y1={270 - pct * 250} x2="480" y2={270 - pct * 250} stroke="#27272a" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Axes */}
                  <line x1="60" y1="270" x2="480" y2="270" stroke="#52525b" strokeWidth="2" />
                  <line x1="60" y1="20" x2="60" y2="270" stroke="#52525b" strokeWidth="2" />

                  {/* Y-axis labels (pages) */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <text key={`yl-${pct}`} x="55" y={273 - pct * 250} textAnchor="end" fill="#52525b" fontSize="9" dominantBaseline="middle">
                      {Math.round(pct * stats.maxScatterPages)}
                    </text>
                  ))}

                  {/* X-axis labels (days) */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <text key={`xl-${pct}`} x={60 + pct * 420} y="285" textAnchor="middle" fill="#52525b" fontSize="9">
                      {Math.round(pct * stats.maxScatterDays)}d
                    </text>
                  ))}

                  {/* Data points — unrated first, rated on top */}
                  {stats.scatterData
                    .sort((a, b) => a.rating - b.rating)
                    .map((point, idx) => {
                    const x = 60 + (point.days / stats.maxScatterDays) * 420;
                    const y = 270 - (point.pages / stats.maxScatterPages) * 250;
                    const radius = point.rating > 0 ? 4 + point.rating * 2.5 : 4;
                    const color = point.rating >= 5 ? "#3b82f6" : point.rating >= 4 ? "#10b981" : point.rating >= 3 ? "#eab308" : point.rating >= 2 ? "#f97316" : point.rating >= 1 ? "#ef4444" : "#52525b";

                    return (
                      <circle key={idx} cx={x} cy={y} r={radius} fill={color} opacity="0.65" className="hover:opacity-100 cursor-pointer">
                        <title>{point.title} — {point.days} days, {point.pages} pages{point.rating > 0 ? `, ${point.rating}★` : ""}</title>
                      </circle>
                    );
                  })}

                  {/* Axis titles */}
                  <text x="270" y="302" textAnchor="middle" fill="#71717a" fontSize="10">Days to Read →</text>
                  <text x="15" y="145" textAnchor="middle" fill="#71717a" fontSize="10" transform="rotate(-90, 15, 145)">Pages ↑</text>
                </svg>
              </div>

              <div className="flex flex-wrap gap-3 mt-3 text-xs items-center">
                <span className="text-muted">Dot size = rating:</span>
                {[{r:1,c:"bg-red-500"},{r:2,c:"bg-orange-500"},{r:3,c:"bg-yellow-500"},{r:4,c:"bg-emerald-500"},{r:5,c:"bg-blue-500"}].map(({r,c}) => (
                  <div key={r} className="flex items-center gap-1">
                    <div className={`rounded-full ${c}`} style={{width: 4+r*2.5, height: 4+r*2.5}} />
                    <span className="text-muted">{r}★</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <div className="rounded-full bg-muted" style={{width: 4, height: 4}} />
                  <span className="text-muted">unrated</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Author stats */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Authors</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Unique Authors" value={stats.uniqueAuthors} />
            <StatCard label={`Books This Year (${new Date().getFullYear()})`} value={`${stats.booksThisYear} → ${stats.projectedBooksThisYear} proj.`} color="emerald" />
          </div>
          {stats.topAuthors.length > 0 && (
            <div className="bg-surface border border-border-custom rounded-xl p-4 space-y-2">
              {stats.topAuthors.map(([author, counts]) => (
                <div key={author} className="flex items-center justify-between">
                  <span className="text-sm text-foreground truncate mr-3">{author}</span>
                  <span className="text-xs text-muted flex-shrink-0">{counts.books} books · {counts.read} read</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Author Diversity */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Author Diversity</h2>

          {/* Gender + top-line numbers */}
          <div className="bg-surface border border-border-custom rounded-xl p-5 mb-4">
            <p className="text-xs text-muted mb-3">Gender (by books owned)</p>
            <div className="flex gap-1 h-6 rounded-full overflow-hidden mb-3">
              {stats.totalGenderBooks > 0 && (
                <>
                  <div className="bg-blue-500 transition-all" style={{ width: `${(stats.genderBookCounts.Male / stats.totalGenderBooks) * 100}%` }} />
                  <div className="bg-pink-500 transition-all" style={{ width: `${(stats.genderBookCounts.Female / stats.totalGenderBooks) * 100}%` }} />
                  <div className="bg-surface-2 transition-all" style={{ width: `${(stats.genderBookCounts.Unknown / stats.totalGenderBooks) * 100}%` }} />
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-blue-400">{stats.genderBookCounts.Male}</p>
                <p className="text-[10px] text-muted">Male · {stats.genderAuthorCounts.Male} authors · {stats.totalGenderBooks > 0 ? Math.round((stats.genderBookCounts.Male / stats.totalGenderBooks) * 100) : 0}%</p>
              </div>
              <div>
                <p className="text-lg font-bold text-pink-400">{stats.genderBookCounts.Female}</p>
                <p className="text-[10px] text-muted">Female · {stats.genderAuthorCounts.Female} authors · {stats.totalGenderBooks > 0 ? Math.round((stats.genderBookCounts.Female / stats.totalGenderBooks) * 100) : 0}%</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted">{stats.genderBookCounts.Unknown}</p>
                <p className="text-[10px] text-muted">Unknown · {stats.genderAuthorCounts.Unknown} authors</p>
              </div>
            </div>
          </div>

          {/* World map */}
          {stats.countryMapPoints.length > 0 && (() => {
            const maxBooks = Math.max(...stats.countryMapPoints.map(p => p.books));
            const totalMapped = stats.countryMapPoints.reduce((s, p) => s + p.books, 0);
            const totalUnmapped = stats.unmappedCountries.reduce((s, [, n]) => s + n, 0);
            return (
              <div className="bg-surface border border-border-custom rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted">Countries of origin (by books owned)</p>
                  <p className="text-[10px] text-muted">
                    {stats.countryMapPoints.length} countries · {totalMapped} books mapped
                    {totalUnmapped > 0 && ` · ${totalUnmapped} unmapped`}
                  </p>
                </div>
                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 720 360" className="w-full h-auto" style={{ maxWidth: 900, background: "var(--surface-2)" }} preserveAspectRatio="xMidYMid meet">
                    {/* Continental silhouettes as background */}
                    <g fill="var(--border)" opacity="0.5">
                      {WORLD_LAND_PATHS.map((d, i) => <path key={i} d={d} />)}
                    </g>
                    {/* Latitude / equator hint */}
                    <line x1="0" y1="180" x2="720" y2="180" stroke="var(--border)" strokeWidth="0.4" opacity="0.5" />
                    {/* Country dots — sqrt scale so tiny counts stay visible */}
                    {stats.countryMapPoints.map(p => {
                      const scale = Math.sqrt(p.books / maxBooks);
                      const rMin = 3, rMax = 24;
                      const r = rMin + scale * (rMax - rMin);
                      return (
                        <g key={p.country}>
                          <circle cx={p.x} cy={p.y} r={r} fill="#10b981" fillOpacity="0.55" stroke="#065f46" strokeWidth="0.5">
                            <title>{p.country}: {p.books} books ({p.authors} authors)</title>
                          </circle>
                          {p.books >= Math.max(5, maxBooks * 0.1) && (
                            <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" pointerEvents="none">
                              {p.books}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                {stats.unmappedCountries.length > 0 && (
                  <p className="text-[10px] text-muted mt-2">
                    Unmapped: {stats.unmappedCountries.slice(0, 5).map(([c, n]) => `${c} (${n})`).join(", ")}
                    {stats.unmappedCountries.length > 5 && ` +${stats.unmappedCountries.length - 5} more`}
                  </p>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ethnicity — donut */}
            {stats.topEthnicities.length > 0 && (
              <div className="bg-surface border border-border-custom rounded-xl p-5">
                <DonutChart
                  title="Ethnicity"
                  data={stats.topEthnicities}
                  colors={["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1", "#14b8a6", "#e11d48"]}
                />
              </div>
            )}

            {/* Denomination — donut */}
            {stats.topDenominations.length > 0 && (
              <div className="bg-surface border border-border-custom rounded-xl p-5">
                <DonutChart
                  title="Denomination"
                  data={stats.topDenominations.slice(0, 12)}
                  colors={["#7c3aed", "#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#14b8a6", "#a855f7", "#0891b2", "#65a30d", "#dc2626"]}
                />
              </div>
            )}

            {/* Top countries — horizontal bar */}
            {stats.topCountries.length > 0 && (
              <div className="bg-surface border border-border-custom rounded-xl p-5">
                <HBar title="Top Countries" data={stats.topCountries.slice(0, 10)} accent="#10b981" />
              </div>
            )}

            {/* Discipline — horizontal bar */}
            {stats.topDisciplines.length > 0 && (
              <div className="bg-surface border border-border-custom rounded-xl p-5">
                <HBar title="Discipline" data={stats.topDisciplines.slice(0, 12)} accent="#8b5cf6" />
              </div>
            )}

            {/* Era — vertical bar in canonical order */}
            {stats.eraSeries.some(([, n]) => n > 0) && (
              <div className="bg-surface border border-border-custom rounded-xl p-5">
                <VBar title="Era" data={stats.eraSeries} accent="#f59e0b" />
              </div>
            )}

            {/* Birth decade histogram */}
            {stats.decadeSeries.length > 0 && (
              <div className="bg-surface border border-border-custom rounded-xl p-5">
                <VBar
                  title="Birth Decade (authors of books owned)"
                  data={stats.decadeSeries.map(([d, n]) => [`${d}s`, n] as [string, number])}
                  accent="#06b6d4"
                />
              </div>
            )}

            {/* School — only if we have any */}
            {stats.topSchools.length > 0 && (
              <div className="bg-surface border border-border-custom rounded-xl p-5 lg:col-span-2">
                <HBar title="Intellectual School (secular)" data={stats.topSchools} accent="#ec4899" />
              </div>
            )}
          </div>
        </section>

        {/* Skill stats */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Skills</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Expert-level Skills (20+)" value={stats.expertSkills} color="emerald" />
            <StatCard label="Master-level Skills (50+)" value={stats.masterSkills} color="blue" />
          </div>
        </section>

        {/* Top sources */}
        {stats.topSources.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Top Sources</h2>
            <div className="bg-surface border border-border-custom rounded-xl p-4 space-y-2.5">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{source}</span>
                  <span className="text-sm text-muted">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Topics - two columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {stats.topUserTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Your Topics</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topUserTopics.map(([topic, count]) => (
                  <span key={topic} className="bg-surface-2 text-foreground px-2.5 py-1 rounded-full text-xs">
                    {topic} <span className="text-muted">({count})</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {stats.topAutoTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Standard Subjects</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topAutoTopics.map(([topic, count]) => (
                  <span key={topic} className="bg-surface-2/50 text-muted px-2.5 py-1 rounded-full text-xs">
                    {topic} <span className="text-muted">({count})</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function ContributionHeatmap({
  startDate,
  pagesPerDay,
  maxPagesInDay,
}: {
  startDate: Date;
  pagesPerDay: Record<string, number>;
  maxPagesInDay: number;
}) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const getColorClass = (pages: number) => {
    if (pages === 0) return "bg-surface-2";
    const ratio = pages / maxPagesInDay;
    if (ratio >= 0.8) return "bg-emerald-400";
    if (ratio >= 0.6) return "bg-emerald-500";
    if (ratio >= 0.35) return "bg-emerald-600";
    return "bg-emerald-800";
  };

  const getHoverColor = (pages: number) => {
    if (pages === 0) return "hover:bg-border-custom";
    const ratio = pages / maxPagesInDay;
    if (ratio >= 0.8) return "hover:bg-emerald-300";
    if (ratio >= 0.6) return "hover:bg-emerald-400";
    if (ratio >= 0.35) return "hover:bg-emerald-500";
    return "hover:bg-emerald-700";
  };

  // Generate 52 weeks of dates
  const weeks: Array<Date[]> = [];
  const currentDate = new Date(startDate);

  // Start from Sunday
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);

  for (let week = 0; week < 53; week++) {
    const weekDays: Date[] = [];
    for (let day = 0; day < 7; day++) {
      weekDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(weekDays);
  }

  // Month labels with positions — use first in-range day per week
  const monthLabels: Array<{ month: string; weekIndex: number }> = [];
  let lastMonth = -1;
  const today = new Date();
  weeks.forEach((week, weekIdx) => {
    const rep = week.find(d => d >= startDate && d <= today) || week[0];
    const month = rep.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        month: rep.toLocaleDateString("en-US", { month: "short" }),
        weekIndex: weekIdx,
      });
      lastMonth = month;
    }
  });

  // Day labels
  const dayLabels = ["Mon", "Wed", "Fri"];
  const dayLabelRows = [1, 3, 5]; // Indices for Mon, Wed, Fri

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex" style={{ marginLeft: "28px" }}>
          {monthLabels.map((label, idx) => {
            const CELL = 16; // 12px cell (w-3) + 4px gap (gap-1)
            const nextIdx = monthLabels[idx + 1]?.weekIndex;
            const span = nextIdx != null ? nextIdx - label.weekIndex : weeks.length - label.weekIndex;
            return (
              <div
                key={`${label.month}-${idx}`}
                className="text-xs text-muted font-medium"
                style={{ width: `${span * CELL}px` }}
              >
                {label.month}
              </div>
            );
          })}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-1">
          {/* Day labels on left */}
          <div className="flex flex-col justify-between pt-1 text-xs text-muted-2 mr-1" style={{ width: "20px" }}>
            {dayLabelRows.map((dayIdx) => (
              <div key={dayIdx} style={{ height: "12px", marginTop: dayIdx === 0 ? 0 : "2px" }}>
                {dayLabels[dayLabelRows.indexOf(dayIdx)]}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          <div className="flex gap-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((date, dayIdx) => {
                  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const pages = pagesPerDay[dateKey] || 0;
                  const isInRange = date >= startDate && date <= new Date();

                  return (
                    <div
                      key={dateKey}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-colors ${
                        isInRange ? `${getColorClass(pages)} ${getHoverColor(pages)}` : "bg-transparent"
                      }`}
                      onMouseEnter={() => setHoveredDate(dateKey)}
                      onMouseLeave={() => setHoveredDate(null)}
                      title={`${new Date(dateKey).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}: ${pages} pages`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip for hovered date */}
      {hoveredDate && pagesPerDay[hoveredDate] !== undefined && (
        <div className="mt-3 text-sm text-muted">
          <span className="text-foreground font-medium">
            {new Date(hoveredDate).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          {": "}
          {pagesPerDay[hoveredDate]} pages
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-custom text-xs">
        <span className="text-muted">Less</span>
        <div className="w-3 h-3 rounded-sm bg-surface-2" />
        <div className="w-3 h-3 rounded-sm bg-emerald-800" />
        <div className="w-3 h-3 rounded-sm bg-emerald-600" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        <span className="text-muted">More</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string | number;
  color?: "emerald" | "blue" | "default";
}) {
  const valueColor: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    default: "text-foreground",
  };

  return (
    <div className="bg-surface border border-border-custom rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor[color]}`}>{value}</p>
    </div>
  );
}

// A polished donut chart: hole in the middle with the total, thicker stroke
// separators between slices, a labeled legend column, and hover tooltips.
function DonutChart({
  title,
  data,
  colors,
}: {
  title: string;
  data: [string, number][];
  colors: string[];
}) {
  const total = data.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return null;
  let cursor = 0;
  const cx = 100, cy = 100, r = 78, innerR = 46;
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  const slices = data.map(([label, n], i) => {
    const pct = n / total;
    const start = cursor;
    cursor += pct * 360;
    const end = cursor;
    return { label, n, pct, start, end, color: colors[i % colors.length] };
  });
  return (
    <div>
      <p className="text-xs text-muted mb-1">{title}</p>
      <p className="text-[10px] text-muted mb-3">{total.toLocaleString()} books · {data.length} categories</p>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <svg viewBox="0 0 200 200" className="w-44 h-44 flex-shrink-0">
          {slices.map((s) => {
            if (s.pct >= 0.999) {
              return (
                <g key={s.label}>
                  <circle cx={cx} cy={cy} r={r} fill={s.color} />
                  <circle cx={cx} cy={cy} r={innerR} fill="var(--surface)" />
                </g>
              );
            }
            const sx1 = cx + r * Math.cos(toRad(s.start));
            const sy1 = cy + r * Math.sin(toRad(s.start));
            const sx2 = cx + r * Math.cos(toRad(s.end));
            const sy2 = cy + r * Math.sin(toRad(s.end));
            const ix1 = cx + innerR * Math.cos(toRad(s.end));
            const iy1 = cy + innerR * Math.sin(toRad(s.end));
            const ix2 = cx + innerR * Math.cos(toRad(s.start));
            const iy2 = cy + innerR * Math.sin(toRad(s.start));
            const largeArc = s.end - s.start > 180 ? 1 : 0;
            return (
              <path
                key={s.label}
                d={`M ${sx1} ${sy1} A ${r} ${r} 0 ${largeArc} 1 ${sx2} ${sy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`}
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth="2"
              >
                <title>{s.label}: {s.n} books ({(s.pct * 100).toFixed(1)}%)</title>
              </path>
            );
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--foreground)">
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--muted)">
            books
          </text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 self-start">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-foreground truncate">{s.label}</span>
              <span className="text-xs text-muted ml-auto flex-shrink-0 tabular-nums">
                {s.n} · {(s.pct * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Horizontal bar chart — label on left, bar fills right, count at end.
function HBar({
  title,
  data,
  accent = "#10b981",
}: {
  title: string;
  data: [string, number][];
  accent?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(([, n]) => n));
  const total = data.reduce((s, [, n]) => s + n, 0);
  return (
    <div>
      <p className="text-xs text-muted mb-1">{title}</p>
      <p className="text-[10px] text-muted mb-3">{total.toLocaleString()} books</p>
      <div className="space-y-1.5">
        {data.map(([label, n]) => {
          const pct = (n / max) * 100;
          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="text-foreground truncate w-32 sm:w-40 flex-shrink-0" title={label}>{label}</span>
              <div className="flex-1 h-4 bg-surface-2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: accent, opacity: 0.85 }} />
              </div>
              <span className="text-muted tabular-nums flex-shrink-0 w-10 text-right">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vertical bar chart — used for era & decade series where category order matters.
function VBar({
  title,
  data,
  accent = "#10b981",
}: {
  title: string;
  data: [string, number][];
  accent?: string;
}) {
  const nonzero = data.filter(([, n]) => n > 0);
  if (nonzero.length === 0) return null;
  const max = Math.max(...data.map(([, n]) => n));
  const total = data.reduce((s, [, n]) => s + n, 0);
  return (
    <div>
      <p className="text-xs text-muted mb-1">{title}</p>
      <p className="text-[10px] text-muted mb-3">{total.toLocaleString()} books</p>
      <div className="flex items-end gap-1 h-40">
        {data.map(([label, n]) => {
          const h = max > 0 ? (n / max) * 100 : 0;
          return (
            <div key={label} className="flex-1 flex flex-col items-center justify-end min-w-0">
              <span className="text-[10px] text-muted tabular-nums mb-0.5">{n > 0 ? n : ""}</span>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${h}%`, minHeight: n > 0 ? 2 : 0, backgroundColor: accent, opacity: 0.85 }}
                title={`${label}: ${n} books`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map(([label]) => (
          <div key={label} className="flex-1 text-[9px] text-muted text-center truncate" title={label}>
            {label.length > 12 ? label.slice(0, 10) + "…" : label}
          </div>
        ))}
      </div>
    </div>
  );
}
