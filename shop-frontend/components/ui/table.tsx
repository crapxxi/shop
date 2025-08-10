"use client"

import type * as React from "react"

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={"w-full caption-bottom text-sm " + (className || "")} {...props} />
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={"[&_tr]:border-b " + (className || "")} {...props} />
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={"[&_tr:last-child]:border-0 " + (className || "")} {...props} />
}

function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={"bg-muted/50 font-medium [&>tr]:last:border-b-0 " + (className || "")} {...props} />
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted " + (className || "")}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={"h-10 px-2 text-left align-middle font-medium text-muted-foreground " + (className || "")}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={"p-2 align-middle " + (className || "")} {...props} />
}

function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={"mt-4 text-sm text-muted-foreground " + (className || "")} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
