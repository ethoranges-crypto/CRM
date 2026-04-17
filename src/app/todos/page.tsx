import { redirect } from "next/navigation"
import { getCanEdit } from "@/lib/auth"
import { getTodos } from "@/modules/todos/actions"
import { TodoList } from "@/modules/todos/components/todo-list"
import { AddTodoForm } from "@/modules/todos/components/add-todo-form"
import { seed } from "@/lib/seed"

export const dynamic = "force-dynamic"

export default async function TodosPage() {
  await seed()

  const canEdit = await getCanEdit()
  if (!canEdit) redirect("/deals")

  const todos = await getTodos()

  const pending = todos.filter((t) => !t.isCompleted)
  const completed = todos.filter((t) => t.isCompleted)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">To-Do</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pending.length} task{pending.length !== 1 ? "s" : ""} remaining
          {completed.length > 0 && ` · ${completed.length} done today`}
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <AddTodoForm />
          <TodoList initialTodos={todos} />
        </div>
      </div>
    </div>
  )
}
