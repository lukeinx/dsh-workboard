// ICS 解析与重复展开。用 TZ=Asia/Shanghai 运行，浮动时间与全天事件按本机时区计算。
import assert from 'node:assert/strict';
import {parseICS, expandEvents, wallToUtc} from '../lib/ics.js';

assert.equal(process.env.TZ, 'Asia/Shanghai', 'run with TZ=Asia/Shanghai');
const iso = ms => new Date(ms).toISOString().slice(0, 16);

// DST：纽约 2026-03-08 02:30 不存在、夏令时前后偏移不同。
assert.equal(iso(wallToUtc({y: 2026, m: 1, d: 15, h: 9, mi: 0, s: 0}, 'America/New_York')), '2026-01-15T14:00');
assert.equal(iso(wallToUtc({y: 2026, m: 7, d: 15, h: 9, mi: 0, s: 0}, 'America/New_York')), '2026-07-15T13:00');

const ics = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT', 'UID:a', 'SUMMARY:Standup\\, daily', 'DTSTART;TZID=America/New_York:20261102T090000', 'DTEND;TZID=America/New_York:20261102T091500',
  'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR', 'EXDATE;TZID=America/New_York:20261111T090000',
  'BEGIN:VALARM', 'SUMMARY:should be ignored', 'END:VALARM', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a', 'RECURRENCE-ID;TZID=America/New_York:20261113T090000', 'SUMMARY:Standup (moved)',
  'DTSTART;TZID=America/New_York:20261113T100000', 'DTEND;TZID=America/New_York:20261113T101500', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:b', 'SUMMARY:Holiday', 'DTSTART;VALUE=DATE:20261112', 'DTEND;VALUE=DATE:20261114', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:c', 'SUMMARY:Lunch with a very long', ' title folded', 'DTSTART:20261112T040000Z', 'DURATION:PT1H', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:d', 'SUMMARY:Review', 'DTSTART:20260130T150000', 'DTEND:20260130T160000', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=12', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:e', 'SUMMARY:Cancelled', 'STATUS:CANCELLED', 'DTSTART:20261112T010000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:f', 'SUMMARY:Never', 'DTSTART;VALUE=DATE:20260131', 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=31', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:g', 'SUMMARY:Daily until', 'DTSTART;TZID=Asia/Shanghai:20261109T200000', 'RRULE:FREQ=DAILY;UNTIL=20261111T120000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:h', 'SUMMARY:Bad zone', 'DTSTART;TZID=China Standard Time:20261112T080000', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const events = parseICS(ics);
assert.equal(events.length, 9);
assert.equal(events[0].summary, 'Standup, daily');
assert.equal(events[3].summary, 'Lunch with a very longtitle folded');

const from = new Date(2026, 10, 9).getTime();
const to = new Date(2026, 10, 16).getTime();
const out = expandEvents(events, from, to);
const list = out.map(e => `${e.allDay ? e.date : iso(e.start)} ${e.title}`);
assert.deepEqual(list, [
  '2026-11-09T12:00 Daily until',
  '2026-11-09T14:00 Standup, daily',
  '2026-11-10T12:00 Daily until',
  '2026-11-11T12:00 Daily until',
  '2026-11-12 Holiday',
  '2026-11-12T00:00 Bad zone',
  '2026-11-12T04:00 Lunch with a very longtitle folded',
  '2026-11-13T15:00 Standup (moved)',
]);
assert.equal(out.find(e => e.title === 'Holiday').end - out.find(e => e.title === 'Holiday').start, 2 * 86400_000);
assert.equal(out.find(e => e.title.startsWith('Lunch')).end - out.find(e => e.title.startsWith('Lunch')).start, 3600_000);

// 每月最后一个周五，共 12 次。
const year = expandEvents(events, new Date(2026, 0, 1).getTime(), new Date(2027, 6, 1).getTime()).filter(e => e.title === 'Review');
assert.equal(year.length, 12);
assert.deepEqual(year.slice(0, 3).map(e => new Date(e.start).getDate()), [30, 27, 27]);
assert.equal(new Date(year[11].start).getMonth(), 11);
console.log('ics ok');
